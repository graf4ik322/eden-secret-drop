import { db, subscribers } from '../db';
import { eq } from 'drizzle-orm';

export interface SubscriberInput {
  tgUserId: string;
  username?: string;
  firstName?: string;
  locale?: string;
}

export async function registerSubscriber(input: SubscriberInput) {
  const existing = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.tgUserId, input.tgUserId))
    .limit(1);

  if (existing.length > 0) {
    // Reactivate if was inactive; update locale only if provided explicitly (user changed it)
    const updateData: Record<string, unknown> = { isActive: true, username: input.username, firstName: input.firstName };
    if (input.locale) updateData.locale = input.locale;
    if (!existing[0].isActive || input.locale) {
      await db
        .update(subscribers)
        .set(updateData)
        .where(eq(subscribers.tgUserId, input.tgUserId));
    }
    return existing[0];
  }

  const [sub] = await db
    .insert(subscribers)
    .values({
      tgUserId: input.tgUserId,
      username: input.username,
      firstName: input.firstName,
      locale: input.locale || 'en',
    })
    .returning();

  return sub;
}

export async function setSubscriberLocale(tgUserId: string, locale: string) {
  await db
    .update(subscribers)
    .set({ locale })
    .where(eq(subscribers.tgUserId, tgUserId));
}

export async function listActiveSubscribers() {
  return db
    .select()
    .from(subscribers)
    .where(eq(subscribers.isActive, true));
}

export async function deactivateSubscriber(tgUserId: string) {
  await db
    .update(subscribers)
    .set({ isActive: false })
    .where(eq(subscribers.tgUserId, tgUserId));
}
