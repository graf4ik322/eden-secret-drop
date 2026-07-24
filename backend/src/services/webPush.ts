/**
 * Web Push service — VAPID-based PWA push notifications.
 * Использует библиотеку web-push для отправки push-уведомлений
 * через Push API браузера (Service Worker).
 *
 * Работает только для PWA/email пользователей.
 * Telegram Mini App пользователи не используют Push API.
 */

import webPush from 'web-push';

// VAPID keys from environment
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:eden@secret-drop.app';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn('[WebPush] VAPID keys not configured — push notifications disabled');
}

// Configure web-push with VAPID details
webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;         // deep link to open on click
  tag?: string;
  data?: Record<string, unknown>;
}

export interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Send a push notification to a single subscriber.
 * Returns the result of webPush.sendNotification.
 * Throws on error — caller should handle 404/410 (expired subs).
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload,
): Promise<void> {
  const notificationPayload = {
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icon-192x192.png',
    badge: payload.badge || '/icon-144x144.png',
    data: {
      url: payload.url || '/',
      ...(payload.data || {}),
    },
    tag: payload.tag || 'eden-drop',
  };

  await webPush.sendNotification(
    subscription,
    JSON.stringify(notificationPayload),
  );
}

/**
 * Get the public VAPID key for the frontend.
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

/**
 * Check if web push is configured (VAPID keys present).
 */
export function isPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}
