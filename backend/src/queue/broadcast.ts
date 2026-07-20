import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const BOT_TOKEN = process.env.BOT_TOKEN || '';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const broadcastQueue = new Queue('broadcast', { connection });

export interface BroadcastJob {
  dropId: number;
  displayId: string;
  title: string;
  price: string;
  miniAppUrl: string;
}

/**
 * Send a Telegram message via Bot API directly (no grammy dependency needed).
 */
async function sendTelegramMessage(chatId: number, text: string, buttonUrl?: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.warn('[Broadcast] No BOT_TOKEN configured, skipping message');
    return false;
  }

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };

  if (buttonUrl) {
    payload.reply_markup = {
      inline_keyboard: [[{ text: '🔐 View Drop', url: buttonUrl }]],
    };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json() as Record<string, unknown>;
      // If user blocked the bot, mark as inactive
      const errDesc = String(err?.description || '');
      if (errDesc.includes('blocked') || errDesc.includes('Forbidden')) {
        return false; // Signal to deactivate
      }
      console.error(`[Broadcast] TG API error for ${chatId}:`, errDesc);
      return true; // Don't deactivate on transient errors
    }
    return true;
  } catch (err) {
    console.error(`[Broadcast] Network error for ${chatId}:`, err);
    return true;
  }
}

export function startBroadcastWorker() {
  const worker = new Worker<BroadcastJob>(
    'broadcast',
    async (job) => {
      const { displayId, title, price, miniAppUrl } = job.data;
      console.log(`[Broadcast] Sending drop ${displayId} - ${title} (€${price})`);

      // Fetch active subscribers from DB via direct query
      const { db, subscribers } = await import('../db');
      const { eq } = await import('drizzle-orm');
      const activeSubs = await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.isActive, true));

      console.log(`[Broadcast] Sending to ${activeSubs.length} subscribers...`);

      const message = `<b>🔥 New Drop: ${title}</b>\n\n` +
        `📦 <b>${displayId}</b>\n` +
        `💰 <b>€${price}</b>\n\n` +
        `A new exclusive item is now available in EDEN Secret Drop.`;

      let sent = 0;
      let blocked = 0;

      for (const sub of activeSubs) {
        const chatId = parseInt(sub.tgUserId, 10);
        if (isNaN(chatId)) continue;

        const success = await sendTelegramMessage(chatId, message, miniAppUrl);
        if (success) {
          sent++;
        } else {
          blocked++;
          // Deactivate blocked users
          await db
            .update(subscribers)
            .set({ isActive: false })
            .where(eq(subscribers.tgUserId, sub.tgUserId));
        }

        // Throttle: ~30 msg/sec (Telegram limit ≈ 30 msg/sec sustained)
        if (sent % 30 === 0 && sent < activeSubs.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      console.log(`[Broadcast] Done: ${sent} sent, ${blocked} blocked, ${activeSubs.length} total`);
    },
    {
      connection,
      concurrency: 1, // Single worker to respect rate limits
      limiter: {
        max: 30,
        duration: 1000,
      },
    },
  );

  worker.on('completed', (job) => {
    console.log(`[Broadcast] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Broadcast] Job ${job?.id} failed:`, err);
  });
}

export async function enqueueBroadcast(data: BroadcastJob) {
  await broadcastQueue.add('notify', data, {
    removeOnComplete: true,
    removeOnFail: 100,
  });
}
