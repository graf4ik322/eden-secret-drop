import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { db, drops, categories, dropStatus, archivedReasons, subscribers, dropCounter, mockups } from '../db';
import { eq, and, or, inArray, desc, asc, sql, getTableColumns } from 'drizzle-orm';
import type { Context } from './context';
import { registerSubscriber, setSubscriberLocale, listActiveSubscribers, deactivateSubscriber } from '../services/subscriber';
import { getDictionary, listKeys, updateValue, seedTranslations } from '../services/i18n';
import { enqueueBroadcast } from '../queue/broadcast';

const t = initTRPC.context<Context>().create();

const BOT_USERNAME = process.env.BOT_USERNAME;
const MINI_APP_URL = process.env.MINI_APP_URL || `https://${process.env.DOMAIN || 'localhost'}`;

/** Build Telegram deep link, or fall back to HTTPS URL if bot username not set */
function dropDeepLink(displayId: string): string {
  if (BOT_USERNAME) {
    return `https://t.me/${BOT_USERNAME.replace('@', '')}?startapp=drop_${displayId}`;
  }
  return `${MINI_APP_URL}/drop/${displayId}`;
}

/* ===== Helper: generate SD-XXXX ===== */
async function generateDisplayId(): Promise<string> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(drops);
  const nextNum = (result[0]?.count ?? 0) + 1;
  return `SD-${String(nextNum).padStart(4, '0')}`;
}

/* ===== Public procedures ===== */
export const publicProcedure = t.procedure;

/* ===== Admin-guarded procedures ===== */
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.isAdmin) throw new Error('Unauthorized: admin access required');
  return next({ ctx });
});
export const adminProcedure = t.procedure.use(isAdmin);

/* ===== Drop Router ===== */
export const dropRouter = t.router({
  /** List active drops (live) for user mode */
  listActive: publicProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      sortBy: z.enum(['newest', 'oldest', 'price_asc', 'price_desc']).default('newest'),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(drops.status, 'live')];
      if (input.categoryId) {
        // Include this category AND its subcategories
        const subIds = await db
          .select({ id: categories.id })
          .from(categories)
          .where(or(eq(categories.id, input.categoryId), eq(categories.parentId, input.categoryId)));
        const ids = subIds.map(s => s.id);
        if (ids.length > 0) conditions.push(inArray(drops.categoryId, ids));
      }

      const orderBy = (() => {
        switch (input.sortBy) {
          case 'oldest': return asc(drops.createdAt);
          case 'price_asc': return asc(drops.price);
          case 'price_desc': return desc(drops.price);
          default: return desc(drops.createdAt);
        }
      })();

      return db
        .select({
          ...getTableColumns(drops),
          mockupImageUrl: mockups.imageUrl,
        })
        .from(drops)
        .leftJoin(mockups, eq(drops.mockupId, mockups.id))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset);
    }),

  /** Get single drop by display ID */
  getByDisplayId: publicProcedure
    .input(z.object({ displayId: z.string() }))
    .query(async ({ input }) => {
      const result = await db
        .select({
          ...getTableColumns(drops),
          mockupImageUrl: mockups.imageUrl,
        })
        .from(drops)
        .leftJoin(mockups, eq(drops.mockupId, mockups.id))
        .where(eq(drops.displayId, input.displayId))
        .limit(1);
      return result[0] || null;
    }),

  /** Latest drops for homepage */
  latest: publicProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      return db
        .select({
          ...getTableColumns(drops),
          mockupImageUrl: mockups.imageUrl,
        })
        .from(drops)
        .leftJoin(mockups, eq(drops.mockupId, mockups.id))
        .where(eq(drops.status, 'live'))
        .orderBy(desc(drops.createdAt))
        .limit(input.limit);
    }),

  /** Get next scheduled drop (for Home timer, TZ 2.3) */
  nextScheduled: publicProcedure.query(async () => {
    const result = await db
      .select({
        ...getTableColumns(drops),
        mockupImageUrl: mockups.imageUrl,
      })
      .from(drops)
      .leftJoin(mockups, eq(drops.mockupId, mockups.id))
      .where(eq(drops.status, 'scheduled'))
      .orderBy(drops.scheduledAt)
      .limit(1);
    return result[0] || null;
  }),

  /** List categories (with subcategories) */
  listCategories: publicProcedure.query(async () => {
    const all = await db
      .select()
      .from(categories)
      .orderBy(categories.sortOrder);

    const roots = all.filter(c => !c.parentId);
    return roots.map(root => ({
      ...root,
      subcategories: all.filter(c => c.parentId === root.id),
    }));
  }),

  /* ===== Admin endpoints ===== */

  /** Create drop */
  create: adminProcedure
    .input(z.object({
      title: z.string().min(1),
      categoryId: z.number(),
      price: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(dropStatus).default('draft'),
      brand: z.string().optional(),
      remaining: z.number().default(1),
      scheduledAt: z.string().optional(),
      notifySubscribers: z.boolean().default(false),
      // FR-10/11: image & mockup fields
      imageUrl: z.string().optional(),
      cutoutUrl: z.string().optional(),
      mockupId: z.number().optional(),
      photos: z.string().optional(),
      specifications: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const displayId = await generateDisplayId();
      const [drop] = await db
        .insert(drops)
        .values({
          displayId,
          title: input.title,
          categoryId: input.categoryId,
          price: input.price,
          description: input.description,
          status: input.status,
          brand: input.brand,
          remaining: input.remaining,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          notifySubscribers: input.notifySubscribers,
          imageUrl: input.imageUrl,
          cutoutUrl: input.cutoutUrl,
          mockupId: input.mockupId,
          photos: input.photos,
          specifications: input.specifications,
        })
        .returning();
      return drop;
    }),

  /** Update drop (any field, no broadcast on status change) */
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      status: z.enum(dropStatus).optional(),
      price: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.number().optional(),
      brand: z.string().optional(),
      remaining: z.number().optional(),
      scheduledAt: z.string().optional(),
      archivedReason: z.enum(archivedReasons).optional(),
      notifySubscribers: z.boolean().optional(),
      // FR-10/11: image & mockup fields
      imageUrl: z.string().optional(),
      cutoutUrl: z.string().optional(),
      mockupId: z.number().optional(),
      photos: z.string().optional(),
      specifications: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const updateData: Record<string, unknown> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.price !== undefined) updateData.price = input.price;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
      if (input.brand !== undefined) updateData.brand = input.brand;
      if (input.remaining !== undefined) updateData.remaining = input.remaining;
      if (input.scheduledAt !== undefined) updateData.scheduledAt = new Date(input.scheduledAt);
      if (input.archivedReason !== undefined) updateData.archivedReason = input.archivedReason;
      if (input.notifySubscribers !== undefined) updateData.notifySubscribers = input.notifySubscribers;
      // FR-10/11: image & mockup fields
      if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
      if (input.cutoutUrl !== undefined) updateData.cutoutUrl = input.cutoutUrl;
      if (input.mockupId !== undefined) updateData.mockupId = input.mockupId;
      if (input.photos !== undefined) updateData.photos = input.photos;
      if (input.specifications !== undefined) updateData.specifications = input.specifications;

      // Always bump updatedAt on any update
      updateData.updatedAt = new Date();

      // If transitioning OUT of 'archived', clear archived_reason
      if (input.status !== undefined && input.status !== 'archived') {
        updateData.archivedReason = null;
      }

      const [drop] = await db
        .update(drops)
        .set(updateData)
        .where(eq(drops.id, input.id))
        .returning();

      if (!drop) throw new Error('Drop not found');
      return drop;
    }),

  /** Publish drop (draft→live / scheduled→live). Broadcast ONLY here. */
  publish: adminProcedure
    .input(z.object({
      id: z.number(),
      notifySubscribers: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const [drop] = await db
        .select()
        .from(drops)
        .where(eq(drops.id, input.id))
        .limit(1);

      if (!drop) throw new Error('Drop not found');
      if (drop.status !== 'draft' && drop.status !== 'scheduled') {
        throw new Error(`Cannot publish drop with status '${drop.status}'. Only draft or scheduled can be published.`);
      }

      const [updated] = await db
        .update(drops)
        .set({ status: 'live', isPublished: true, updatedAt: new Date() })
        .where(eq(drops.id, input.id))
        .returning();

      // Increment global drop counter
      await db.update(dropCounter)
        .set({ count: sql`count + 1`, updatedAt: new Date() })
        .where(eq(dropCounter.id, 1));

      // Broadcast if notify requested (input overrides DB value)
      const shouldNotify = input.notifySubscribers ?? drop.notifySubscribers;
      if (shouldNotify) {
        const deepLink = dropDeepLink(drop.displayId);

        // Resolve best image for Telegram: jpegUrl > imageUrl (WebP rejected by sendPhoto)
        let broadcastImage: string | undefined;
        if (drop.mockupId) {
          try {
            const [mockup] = await db
              .select({ imageUrl: mockups.imageUrl, jpegUrl: mockups.jpegUrl })
              .from(mockups)
              .where(eq(mockups.id, drop.mockupId))
              .limit(1);
            if (mockup?.jpegUrl) broadcastImage = mockup.jpegUrl;
            else if (mockup?.imageUrl) broadcastImage = mockup.imageUrl;
          } catch (err) {
            console.error('[Publish] Failed to fetch mockup image:', err);
          }
        }
        if (!broadcastImage) broadcastImage = drop.cutoutUrl || drop.imageUrl || undefined;

        // Telegram sendPhoto требует абсолютный URL
        if (broadcastImage && broadcastImage.startsWith('/')) {
          broadcastImage = `${MINI_APP_URL}${broadcastImage}`;
        }
        // Если MINI_APP_URL некорректный — не шлём битую ссылку
        if (broadcastImage && !/^https?:\/\/./.test(broadcastImage)) {
          console.warn(`[Publish] Invalid broadcastImage "${broadcastImage}" — falling back to text-only`);
          broadcastImage = undefined;
        }

        console.log(`[Publish] Broadcast image: ${broadcastImage ?? '⚠️ none — text-only'}`);

        await enqueueBroadcast({
          dropId: drop.id,
          displayId: drop.displayId,
          title: drop.title,
          price: drop.price || '0',
          miniAppUrl: deepLink,
          imageUrl: broadcastImage,
        });
      }

      return updated;
    }),

  /** Mark as sold (live→archived with reason='sold') */
  markAsSold: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [drop] = await db
        .select()
        .from(drops)
        .where(eq(drops.id, input.id))
        .limit(1);

      if (!drop) throw new Error('Drop not found');
      if (drop.status !== 'live') {
        throw new Error(`Cannot mark as sold a drop with status '${drop.status}'. Only live drops can be marked as sold.`);
      }

      const [updated] = await db
        .update(drops)
        .set({ status: 'archived', archivedReason: 'sold', updatedAt: new Date() })
        .where(eq(drops.id, input.id))
        .returning();

      return updated;
    }),

  /** Delete drop */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [drop] = await db
        .select()
        .from(drops)
        .where(eq(drops.id, input.id))
        .limit(1);
      if (!drop) throw new Error('Drop not found');

      await db.delete(drops).where(eq(drops.id, input.id));
      return { success: true };
    }),

  /** List all drops (admin) */
  listAll: adminProcedure
    .input(z.object({
      status: z.enum(dropStatus).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const conditions = input.status ? [eq(drops.status, input.status)] : [];
      return db
        .select({
          ...getTableColumns(drops),
          mockupImageUrl: mockups.imageUrl,
        })
        .from(drops)
        .leftJoin(mockups, eq(drops.mockupId, mockups.id))
        .where(and(...conditions))
        .orderBy(desc(drops.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  /** Increment view counter (public) */
  incrementViews: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [drop] = await db
        .select()
        .from(drops)
        .where(eq(drops.id, input.id))
        .limit(1);
      if (!drop) throw new Error('Drop not found');

      await db
        .update(drops)
        .set({ views: sql`views + 1` })
        .where(eq(drops.id, input.id));

      return { success: true };
    }),

  /** Drop stats for Home counter (FR-16) */
  stats: publicProcedure.query(async () => {
    const [{ allTime }] = await db
      .select({ allTime: sql<number>`count(*)::int` })
      .from(drops)
      .where(inArray(drops.status, ['live', 'archived']));
    const [{ active }] = await db
      .select({ active: sql<number>`count(*)::int` })
      .from(drops)
      .where(eq(drops.status, 'live'));
    return { allTime, active };
  }),
});

/* ===== Category Router ===== */
export const categoryRouter = t.router({
  list: publicProcedure.query(async () => {
    return db.select().from(categories).orderBy(categories.sortOrder);
  }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      parentId: z.number().optional(),
      icon: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const [cat] = await db
          .insert(categories)
          .values({
            name: input.name,
            parentId: input.parentId ?? null,
            icon: input.icon ?? null,
            sortOrder: 0,
            isActive: true,
          })
          .returning();
        return cat;
      } catch (err) {
        console.error('[Category] Create failed:', err);
        const e = err as Error & { code?: string; detail?: string; schema?: string; table?: string; column?: string };
        throw new Error(
          `Category create failed: ${e.message}` +
          (e.code ? ` (code: ${e.code})` : '') +
          (e.detail ? ` — ${e.detail}` : '')
        );
      }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // TZ 2.2: check that category has no drops
      const existingDrops = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(drops)
        .where(and(eq(drops.categoryId, input.id), sql`status != 'archived'`));
      if (existingDrops[0].count > 0) {
        throw new Error('Cannot delete category with active drops');
      }
      await db.delete(categories).where(eq(categories.id, input.id));
      return { success: true };
    }),
});

/* ===== Mockups (FR-11) ===== */
export const mockupRouter = t.router({
  list: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.db.select().from(mockups).orderBy(mockups.createdAt);
    }),
  create: adminProcedure
    .input(z.object({ name: z.string().min(1), imageUrl: z.string().max(512).optional(), jpegUrl: z.string().max(512).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [m] = await ctx.db.insert(mockups).values({ name: input.name, imageUrl: input.imageUrl, jpegUrl: input.jpegUrl }).returning();
      return m;
    }),
  update: adminProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).optional(), imageUrl: z.string().max(512).optional(), jpegUrl: z.string().max(512).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [m] = await ctx.db.update(mockups).set({
        ...(input.name && { name: input.name }),
        ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
        ...(input.jpegUrl !== undefined && { jpegUrl: input.jpegUrl }),
        updatedAt: new Date(),
      }).where(eq(mockups.id, input.id)).returning();
      return m;
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(mockups).where(eq(mockups.id, input.id));
      return { ok: true };
    }),
});

/* ===== Subscriber Router (TZ 2.5) ===== */
export const subscriberRouter = t.router({
  register: publicProcedure
    .input(z.object({ tgUserId: z.string(), username: z.string().optional(), firstName: z.string().optional(), locale: z.string().optional() }))
    .mutation(async ({ input }) => {
      return registerSubscriber(input);
    }),
  setLocale: publicProcedure
    .input(z.object({ tgUserId: z.string(), locale: z.string() }))
    .mutation(async ({ input }) => {
      return setSubscriberLocale(input.tgUserId, input.locale);
    }),
  list: adminProcedure.query(async () => {
    return listActiveSubscribers();
  }),
  deactivate: adminProcedure
    .input(z.object({ tgUserId: z.string() }))
    .mutation(async ({ input }) => {
      await deactivateSubscriber(input.tgUserId);
      return { success: true };
    }),
});

/* ===== Auth Router (TZ 2.7) ===== */
export const authRouter = t.router({
  checkAdmin: publicProcedure
    .query(async ({ ctx }) => {
      return {
        isAdmin: ctx.isAdmin,
        userId: ctx.tgUserId,
        user: ctx.userData,
      };
    }),
  debug: publicProcedure
    .query(async ({ ctx }) => {
      const raw = process.env.ADMIN_IDS || '(empty)';
      const adminIds = raw === '(empty)' ? [] : raw.split(',').map(id => id.trim()).filter(Boolean);
      const receivedId = ctx.tgUserId;

      // Determine initData auth_date from context if available
      let authDate: string | null = null;
      let initDataAge: string | null = null;
      let userPhotoUrl: string | null = null;
      let userLanguage: string | null = null;
      const user = ctx.userData;
      if (user && 'id' in user) {
        // Extra user info is stored in ctx for reference
      }

      return {
        receivedUserId: receivedId,
        receivedType: typeof receivedId,
        isAdmin: ctx.isAdmin,
        userData: ctx.userData ? {
          id: ctx.userData.id,
          firstName: ctx.userData.firstName,
          username: ctx.userData.username || null,
        } : null,
        adminIdsRaw: raw,
        adminIdsArray: adminIds,
        adminIdsTypes: adminIds.map(id => typeof id),
        match: receivedId ? adminIds.includes(receivedId) : 'no id to match',
        hasBotToken: !!process.env.BOT_TOKEN,
        nodeEnv: process.env.NODE_ENV,
        // FR-03: echo received headers for CORS/header debugging
        headers: {
          authorization: null,
          'x-tg-user-id': ctx.tgUserId,
          'x-tg-first-name': ctx.userData?.firstName || null,
          'x-tg-username': ctx.userData?.username || null,
          origin: null,
          referer: null,
          'user-agent': null,
          'content-type': null,
        },
      };
    }),
});

/* ===== i18n Router (FR-04/FR-20) ===== */
const i18nRouter = t.router({
  getDictionary: publicProcedure
    .input(z.object({ locale: z.string().default('en') }))
    .query(async ({ input }) => {
      const dict = await getDictionary(input.locale);
      if (Object.keys(dict).length === 0) {
        // Seed on first call if empty — defaults are in services/i18n.ts
        const { i18nDefaults } = await import('../services/i18n');
        await seedTranslations(i18nDefaults);
        return getDictionary(input.locale);
      }
      return dict;
    }),
  listKeys: adminProcedure
    .query(async () => {
      const groups = await listKeys(true);
      if (groups.length === 0) {
        const { i18nDefaults } = await import('../services/i18n');
        await seedTranslations(i18nDefaults);
        return listKeys(true);
      }
      return groups;
    }),
  updateValue: adminProcedure
    .input(z.object({ key: z.string(), locale: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      await updateValue(input.key, input.locale, input.value);
      return { success: true };
    }),
});

/* ===== App Router ===== */
export const appRouter = t.router({
  drop: dropRouter,
  category: categoryRouter,
  mockup: mockupRouter,
  subscriber: subscriberRouter,
  auth: authRouter,
  i18n: i18nRouter,
  health: publicProcedure.query(() => ({ status: 'ok', timestamp: new Date().toISOString() })),
});

export type AppRouter = typeof appRouter;
