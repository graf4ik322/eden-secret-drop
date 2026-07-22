import 'dotenv/config';
import { Bot, webhookCallback } from 'grammy';
import Fastify from 'fastify';

const BOT_TOKEN = process.env.BOT_TOKEN!;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const DOMAIN = process.env.DOMAIN || '';
const MINI_APP_URL = process.env.MINI_APP_URL || (DOMAIN ? `https://${DOMAIN}` : '');
const BOT_USERNAME = process.env.BOT_USERNAME || 'secretdrop_appbot';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const PORT = parseInt(process.env.BOT_PORT || '3002', 10);
const HOST = process.env.HOST || '0.0.0.0';

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is required');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

bot.command('debug', async (ctx) => {
  await ctx.reply('🔍 *EDEN Diagnostics*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔐 Open Mini App', url: `https://t.me/secretdrop_appbot?startapp` }],
      ],
    },
  });
});

/** Register subscriber via backend tRPC */
async function registerSubscriber(tgUserId: string, username?: string, firstName?: string, locale?: string) {
  try {
    const url = `${BACKEND_URL}/trpc/subscriber.register`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tgUserId,
        username,
        firstName,
        locale,
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
    user.language_code,
  );

  const fullscreenUrl = `https://t.me/${BOT_USERNAME.replace('@', '')}?startapp`;
  await ctx.reply(
    '✨ Welcome to *EDEN Secret Drop*!\n\n' +
    'You are now registered. You\'ll receive notifications about exclusive drops.\n\n' +
    'Tap the button below to open the full-screen Mini App:',
    {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔐 Open EDEN', url: fullscreenUrl }],
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
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📦 Open Drop Studio', url: `https://t.me/${BOT_USERNAME.replace('@', '')}?startapp` }],
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
