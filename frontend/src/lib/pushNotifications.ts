/**
 * Push Notifications utility for EDEN Secret Drop PWA.
 *
 * Управление PWA push-подписками:
 * - Подписка/отписка от push-уведомлений
 * - Получение VAPID public key с сервера
 * - Определение: PWA vs Telegram WebView
 */

import { trpcCall } from './trpc';

/**
 * Проверяет, можно ли использовать Push API в текущем окружении.
 * Push работает ТОЛЬКО в PWA (браузер/standalone), НЕ в Telegram WebView.
 */
export function canUsePushNotifications(): boolean {
  if (typeof window === 'undefined') return false;
  // Telegram WebView не поддерживает Service Worker push
  if ((window as any).Telegram?.WebApp) return false;
  // Service Worker обязателен
  if (!('serviceWorker' in navigator)) return false;
  // Push Manager обязателен
  if (!('PushManager' in window)) return false;
  return true;
}

/**
 * Запрашивает разрешение на уведомления + подписывается.
 * Возвращает true если подписка успешна.
 */
export async function requestAndSubscribe(): Promise<boolean> {
  if (!canUsePushNotifications()) {
    console.warn('[Push] Push notifications not available in this environment');
    return false;
  }

  try {
    // 1. Запрашиваем разрешение (если ещё не дано)
    if (window.Notification.permission === 'denied') {
      console.warn('[Push] Notification permission denied');
      return false;
    }

    if (window.Notification.permission === 'default') {
      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[Push] Permission not granted:', permission);
        return false;
      }
    }

    // 2. Получаем VAPID public key с сервера
    const vapidRes = await trpcCall('push.vapidKey') as { publicKey: string; configured: boolean };
    if (!vapidRes?.configured || !vapidRes?.publicKey) {
      console.warn('[Push] Server push not configured (VAPID keys missing)');
      return false;
    }

    // 3. Ждём готовности Service Worker
    const registration = await navigator.serviceWorker.ready;

    // 4. Проверяем, не подписаны ли уже
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      // Уже подписаны — обновляем на сервере (на случай если ключи поменялись)
      await saveSubscriptionToServer(existingSub.toJSON() as any);
      return true;
    }

    // 5. Подписываемся
    const pushSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidRes.publicKey) as unknown as string,
    });

    // 6. Отправляем подписку на сервер
    await saveSubscriptionToServer(pushSubscription.toJSON() as any);
    console.log('[Push] Successfully subscribed to push notifications');
    return true;
  } catch (err) {
    console.error('[Push] Subscription failed:', err);
    return false;
  }
}

/**
 * Отписывается от push-уведомлений.
 */
export async function unsubscribe(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Отписываемся в браузере
      await subscription.unsubscribe();
    }

    // Уведомляем сервер
    try {
      await trpcCall('push.unsubscribe', { method: 'POST' });
    } catch {
      // Серверная ошибка не критична — главное отписаться локально
    }

    console.log('[Push] Successfully unsubscribed');
    return true;
  } catch (err) {
    console.error('[Push] Unsubscribe failed:', err);
    return false;
  }
}

/**
 * Проверяет статус push-подписки.
 */
export async function getPushStatus(): Promise<{
  subscribed: boolean;
  permission: NotificationPermission;
  canPush: boolean;
}> {
  const canPush = canUsePushNotifications();
  let subscribed = false;
  let permission: NotificationPermission = 'default';

  if (canPush && 'Notification' in window) {
    permission = window.Notification.permission;
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      subscribed = !!sub;
    } catch {
      // SW not ready yet
    }
  }

  return { subscribed, permission, canPush };
}

/**
 * Сохраняет push-подписку на сервере через tRPC.
 */
async function saveSubscriptionToServer(sub: {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
}): Promise<void> {
  await trpcCall('push.subscribe', {
    method: 'POST',
    body: sub,
  });
}

/**
 * Конвертирует base64-encoded VAPID public key в Uint8Array
 * (требование Push API).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
