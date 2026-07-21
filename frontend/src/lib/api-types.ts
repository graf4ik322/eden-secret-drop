// Shared API types — mirrors backend/src/trpc/router.ts
// These are used by the frontend tRPC client for type safety

export const DROP_STATUSES = ['draft', 'scheduled', 'live', 'archived'] as const;
export type DropStatus = (typeof DROP_STATUSES)[number];

export const ARCHIVED_REASONS = ['sold', 'manual'] as const;
export type ArchivedReason = (typeof ARCHIVED_REASONS)[number];

export interface Category {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
  icon: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithSubs extends Category {
  subcategories: Category[];
}

export interface Drop {
  id: number;
  displayId: string;
  title: string;
  status: DropStatus;
  categoryId: number;
  price: string | null;
  description: string | null;
  imageUrl: string | null;
  cutoutUrl: string | null;
  specifications: string | null;
  remaining: number;
  brand: string | null;
  scheduledAt: string | null;
  archivedReason: ArchivedReason | null;
  notifySubscribers: boolean;
  isPublished: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscriber {
  id: number;
  tgUserId: string;
  username: string | null;
  firstName: string | null;
  isActive: boolean;
  createdAt: string;
}

// Input types for mutations
export interface CreateDropInput {
  title: string;
  categoryId: number;
  price?: string;
  description?: string;
  status?: DropStatus;
  brand?: string;
  remaining?: number;
  scheduledAt?: string;
}

export interface UpdateDropInput {
  id: number;
  title?: string;
  status?: DropStatus;
  price?: string;
  description?: string;
  categoryId?: number;
  brand?: string;
  remaining?: number;
  scheduledAt?: string;
}

export interface CreateCategoryInput {
  name: string;
  parentId?: number;
  icon?: string;
}

export interface RegisterSubscriberInput {
  tgUserId: string;
  username?: string;
  firstName?: string;
}
