import { pgTable, serial, integer, varchar, text, numeric, timestamp, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/* ===== Drop Status Enum as varchar ===== */
export const dropStatus = ['draft', 'scheduled', 'live', 'archived'] as const;
export type DropStatus = (typeof dropStatus)[number];

/* archived_reason — only used when status='archived' */
export const archivedReasons = ['sold', 'manual'] as const;
export type ArchivedReason = (typeof archivedReasons)[number];

/* ===== Categories (TZ 2.2) ===== */
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  parentId: integer('parent_id'),                  // nullable — root categories have no parent
  sortOrder: integer('sort_order').default(0),
  icon: varchar('icon', { length: 10 }),           // emoji icon (optional)
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  children: many(categories, { relationName: 'children' }),
  drops: many(drops),
}));

/* ===== Drops (TZ 2.1) ===== */
export const drops = pgTable('drops', {
  id: serial('id').primaryKey(),
  displayId: varchar('display_id', { length: 8 }).notNull().unique(),  // "SD-XXXX"
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // DropStatus
  categoryId: integer('category_id').notNull(),     // always points to leaf (subcategory if exists)
  price: numeric('price', { precision: 12, scale: 2 }), // numeric for future checkout
  description: text('description'),
  imageUrl: varchar('image_url', { length: 512 }),
  cutoutUrl: varchar('cutout_url', { length: 512 }), // after background removal
  specifications: text('specifications'),             // JSON string of key-value pairs
  remaining: integer('remaining').default(1),        // "Remaining N pcs"
  brand: varchar('brand', { length: 255 }),
  publishedMessageId: integer('published_message_id'),
  scheduledAt: timestamp('scheduled_at'),
  archivedReason: varchar('archived_reason', { length: 10 }),
  notifySubscribers: boolean('notify_subscribers').default(false),
  isPublished: boolean('is_published').default(false),
  views: integer('views').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  // FR-10/11
  mockupId: integer('mockup_id'),
  photos: text('photos'),                     // JSON array of up to 4 photo URLs
});

export const dropsRelations = relations(drops, ({ one }) => ({
  category: one(categories, {
    fields: [drops.categoryId],
    references: [categories.id],
  }),
}));

/* ===== Subscribers (TZ 2.5) ===== */
export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  tgUserId: varchar('tg_user_id', { length: 64 }).notNull().unique(),
  username: varchar('username', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  // Email auth fields (nullable — only for email-registered users)
  email: varchar('email', { length: 255 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  emailVerified: boolean('email_verified').default(false),
  // Telegram-linked account (nullable — only for Telegram users who add email)
  linkedTgUserId: varchar('linked_tg_user_id', { length: 64 }),
  isActive: boolean('is_active').default(true),
  locale: varchar('locale', { length: 5 }).default('en'),
  subscribedAt: timestamp('subscribed_at').defaultNow(),
  lastNotifiedAt: timestamp('last_notified_at'),
});

/* ===== Email Verification Codes ===== */
export const emailVerificationCodes = pgTable('email_verification_codes', {
  id: serial('id').primaryKey(),
  subscriberId: integer('subscriber_id').notNull().references(() => subscribers.id),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

/* ===== Refresh Tokens ===== */
export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  subscriberId: integer('subscriber_id').notNull().references(() => subscribers.id),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  deviceInfo: varchar('device_info', { length: 255 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

/* ===== Admins (TZ 2.7) ===== */
export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  tgUserId: varchar('tg_user_id', { length: 64 }).notNull().unique(),
  username: varchar('username', { length: 255 }),
  addedAt: timestamp('added_at').defaultNow(),
});

/* ===== Drop Counter (TZ 2.3) ===== */
export const dropCounter = pgTable('drop_counter', {
  id: serial('id').primaryKey(),
  count: integer('count').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/* ===== Mockups (FR-11) ===== */
export const mockups = pgTable('mockups', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  imageUrl: varchar('image_url', { length: 512 }),
  jpegUrl: varchar('jpeg_url', { length: 512 }),   // FR-03/BUG-29: JPEG для Telegram Bot API
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/* ===== Translations (FR-04/FR-20) ===== */
export const translations = pgTable('translations', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 255 }).notNull(),
  locale: varchar('locale', { length: 5 }).notNull(),
  value: text('value'),
  section: varchar('section', { length: 50 }),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueKeyLocale: uniqueIndex('uq_translations_key_locale').on(table.key, table.locale),
}));
