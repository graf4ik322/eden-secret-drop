/**
 * EDEN Secret Drop — Service Worker
 * 
 * Стратегия: CacheFirst для статики, NetworkFirst для API,
 * StaleWhileRevalidate для всего остального.
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `eden-static-${CACHE_VERSION}`;
const API_CACHE = `eden-api-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `eden-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-144x144.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Установка — кэшируем статику
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

// Активация — чистим старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Только same-origin
  if (url.origin !== self.location.origin) return;

  // API запросы — NetworkFirst
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/trpc/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Статика (js, css, png) — CacheFirst
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|ico)$/)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Всё остальное (SPA fallback) — StaleWhileRevalidate
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

/* ===== Push Notifications ===== */

/**
 * Find a matching window client or open a new one.
 */
async function matchClient(urlToOpen) {
  const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  return windowClients.find((windowClient) => windowClient.url.startsWith(urlToOpen));
}

/**
 * Focus on an existing window or open a new one.
 */
async function focusOrOpenWindow(url) {
  const urlToOpen = url || self.location.origin;
  const matchingClient = await matchClient(urlToOpen);
  return matchingClient
    ? matchingClient.focus()
    : clients.openWindow(urlToOpen);
}

/**
 * Handle incoming push event from the server.
 */
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW Push] Empty push event');
    return;
  }

  try {
    const pushData = event.data.json();

    const title = pushData.title || 'EDEN Secret Drop';
    const options = {
      body: pushData.body || '',
      icon: pushData.icon || '/icon-192x192.png',
      badge: pushData.badge || '/icon-144x144.png',
      tag: pushData.tag || 'eden-drop',
      data: pushData.data || {},
      vibrate: [200, 100, 200],
    };

    event.waitUntil(
      self.registration.showNotification(title, options),
    );
  } catch (err) {
    console.error('[SW Push] Failed to parse push data:', err);
  }
});

/**
 * Handle notification click — open the app and navigate to the drop.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    focusOrOpenWindow(urlToOpen).then((windowClient) => {
      // Post a message to the client so it can react to the notification click
      if (windowClient && windowClient.postMessage) {
        windowClient.postMessage({
          type: 'notification-clicked',
          url: urlToOpen,
        });
      }
    }),
  );
});
