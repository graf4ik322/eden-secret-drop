import 'dotenv/config';
import { Bot, webhookCallback } from 'grammy';
import Fastify from 'fastify';

const BOT_TOKEN = process.env.BOT_TOKEN!;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const DOMAIN = process.env.DOMAIN || '';
const MINI_APP_URL = process.env.MINI_APP_URL || (DOMAIN ? `https://${DOMAIN}` : '');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const PORT = parseInt(process.env.BOT_PORT || '3002', 10);
const HOST = process.env.HOST || '0.0.0.0';

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is required');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

bot.command('debug', async (ctx) => {
  const debugUrl = `${MINI_APP_URL}/debug.html`;
  await ctx.reply('🔍 *EDEN Diagnostics*', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔍 Run Diagnostics', web_app: { url: debugUrl } }],
        [{ text: '🔐 Open Mini App', web_app: { url: MINI_APP_URL } }],
      ],
    },
  });
});

/** Register subscriber via backend tRPC */
async function registerSubscriber(tgUserId: string, username?: string, firstName?: string) {
  try {
    const url = `${BACKEND_URL}/trpc/subscriber.register`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tgUserId,
        username,
        firstName,
      }),
    });
    if (!response.ok) {
      console.error(`Failed to register subscriber: ${response.status}`);
    }
  } catch (err) {
    console.error('Error registering subscriber:', err);
  }
}

/* ===== Commands ===== */

/** /start — Register subscriber (TZ 2.5) */
bot.command('start', async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  // Register in DB
  await registerSubscriber(
    user.id.toString(),
    user.username,
    user.first_name,
  );

  await ctx.reply(
    '✨ Welcome to *EDEN Secret Drop*!\n\n' +
    'You are now registered. You\'ll receive notifications about exclusive drops.\n\n' +
    'Open the Mini App to browse:',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔐 Open EDEN', web_app: { url: MINI_APP_URL || 'https://eden-secret-drop.pages.dev' } }],
        ],
      },
    },
  );
});

/** /admin — Admin panel link (only for admins) */
bot.command('admin', async (ctx) => {
  const userId = ctx.from?.id.toString();
  const admins = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim());

  if (!userId || !admins.includes(userId)) {
    return ctx.reply('⛔ Unauthorized');
  }

  await ctx.reply('🛠 *Drop Studio*\n\nManage your drops and categories:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📦 Open Drop Studio', web_app: { url: `${MINI_APP_URL}/studio` } }],
      ],
    },
  });
});

/* ===== Webhook or Polling ===== */
if (WEBHOOK_URL) {
  const server = Fastify();

  server.post(`/${BOT_TOKEN}`, webhookCallback(bot, 'fastify'));
  server.get('/health', async () => ({ status: 'ok', bot: 'eden' }));

  await bot.api.setWebhook(`${WEBHOOK_URL}/${BOT_TOKEN}`);
  console.log(`🤖 Webhook set to ${WEBHOOK_URL}/${BOT_TOKEN}`);

  await server.listen({ port: PORT, host: HOST });
  console.log(`🤖 Bot webhook server running at ${HOST}:${PORT}`);
} else {
  console.log('🤖 Starting bot in polling mode...');
  bot.start();
}
