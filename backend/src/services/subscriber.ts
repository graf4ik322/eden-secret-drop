import { db, subscribers } from '../db';
import { eq } from 'drizzle-orm';

export interface SubscriberInput {
  tgUserId: string;
  username?: string;
  firstName?: string;
}

export async function registerSubscriber(input: SubscriberInput) {
  const existing = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.tgUserId, input.tgUserId))
    .limit(1);

  if (existing.length > 0) {
    // Reactivate if was inactive
    if (!existing[0].isActive) {
      await db
        .update(subscribers)
        .set({ isActive: true, username: input.username, firstName: input.firstName })
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
    })
    .returning();

  return sub;
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
