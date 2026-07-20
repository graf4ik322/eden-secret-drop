import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { db, drops, categories, dropStatus, subscribers, dropCounter } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { Context } from './context';
import { registerSubscriber, listActiveSubscribers, deactivateSubscriber } from '../services/subscriber';
import { enqueueBroadcast } from '../queue/broadcast';

const t = initTRPC.context<Context>().create();

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
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(drops.status, 'live')];
      if (input.categoryId) conditions.push(eq(drops.categoryId, input.categoryId));

      return db
        .select()
        .from(drops)
        .where(and(...conditions))
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(desc(drops.createdAt));
    }),

  /** Get single drop by display ID */
  getByDisplayId: publicProcedure
    .input(z.object({ displayId: z.string() }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(drops)
        .where(eq(drops.displayId, input.displayId))
        .limit(1);
      return result[0] || null;
    }),

  /** Latest drops for homepage */
  latest: publicProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(drops)
        .where(eq(drops.status, 'live'))
        .orderBy(desc(drops.createdAt))
        .limit(input.limit);
    }),

  /** Get next scheduled drop (for Home timer, TZ 2.3) */
  nextScheduled: publicProcedure.query(async () => {
    const result = await db
      .select()
      .from(drops)
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
        })
        .returning();
      return drop;
    }),

  /** Update drop */
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

      const [drop] = await db
        .update(drops)
        .set(updateData)
        .where(eq(drops.id, input.id))
        .returning();

      // Increment counter + trigger broadcast when drop goes live (TZ 2.3, 2.5)
      if (input.status === 'live' && drop) {
        // Increment global drop counter
        const [counter] = await db.update(dropCounter)
          .set({ count: sql`count + 1`, updatedAt: new Date() })
          .where(eq(dropCounter.id, 1))
          .returning();
        const miniAppUrl = process.env.MINI_APP_URL || `https://${process.env.DOMAIN || 'localhost'}`;
        await enqueueBroadcast({
          dropId: drop.id,
          displayId: drop.displayId,
          title: drop.title,
          price: drop.price || '0',
          miniAppUrl: `${miniAppUrl}/drop/${drop.displayId}`,
        });
      }

      return drop;
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
        .select()
        .from(drops)
        .where(and(...conditions))
        .orderBy(desc(drops.createdAt))
        .limit(input.limit)
        .offset(input.offset);
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
          })
          .returning();
        return cat;
      } catch (err) {
        console.error('[Category] Create failed:', err);
        throw new Error(`Category create failed: ${(err as Error).message}`);
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

/* ===== Subscriber Router (TZ 2.5) ===== */
export const subscriberRouter = t.router({
  register: publicProcedure
    .input(z.object({
      tgUserId: z.string(),
      username: z.string().optional(),
      firstName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return registerSubscriber(input);
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
    .input(z.object({ initData: z.string().optional() }).optional())
    .query(async ({ ctx }) => {
      return {
        isAdmin: ctx.isAdmin,
        userId: ctx.tgUserId,
        user: ctx.userData,
      };
    }),
});

/* ===== Main App Router ===== */
export const appRouter = t.router({
  drop: dropRouter,
  category: categoryRouter,
  subscriber: subscriberRouter,
  auth: authRouter,
  health: publicProcedure.query(() => ({ status: 'ok', timestamp: new Date().toISOString() })),
});

export type AppRouter = typeof appRouter;
