import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

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

export function startBroadcastWorker() {
  const worker = new Worker<BroadcastJob>(
    'broadcast',
    async (job) => {
      const { displayId, title, price, miniAppUrl } = job.data;
      console.log(`[Broadcast] Sending drop ${displayId} - ${title} (€${price})`);

      // TODO: fetch all active subscribers from DB
      // TODO: throttle to ~30 msg/sec via grammY
      // TODO: remove blocked users from subscriber list
      // This will be implemented when the bot is fully wired to the backend

      console.log(`[Broadcast] Queue done for ${displayId}`);
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 30,        // 30 messages
        duration: 1000, // per second (Telegram limit)
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
