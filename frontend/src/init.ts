/**
 * EDEN Secret Drop — Telegram Mini App initialization.
 * Использует @telegram-apps/sdk (v3) для корректной работы viewport и fullscreen.
 * 
 * Порядок инициализации:
 *   1. sdkInit() — базовая инициализация SDK
 *   2. mountViewport() — монтирование viewport
 *   3. expandViewport() — растягивание на всю высоту
 *   4. requestFullscreen() — полноэкранный режим (если мобильный Telegram)
 */

import {
  init as sdkInit,
  mountViewport,
  bindViewportCssVars,
  expandViewport,
  requestFullscreen,
  isFullscreen,
} from '@telegram-apps/sdk';

/**
 * Проверяет, запущено ли внутри Telegram WebView.
 */
function isTelegramWebView(): boolean {
  return typeof window !== 'undefined'
    && typeof (window as any).Telegram?.WebApp?.initData === 'string';
}

/**
 * Проверяет, что платформа мобильная (iOS или Android).
 */
function isTelegramMobile(): boolean {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return false;
    const plat = (tg.platform || '').toLowerCase();
    return plat.includes('ios') || plat.includes('android') || plat.includes('tdesktop');
  } catch {
    return false;
  }
}

/**
 * Initializes the Telegram Mini App SDK.
 * Безопасно вызывать вне Telegram WebView — проверяет isTelegramWebView().
 */
export function init(): void {
  if (!isTelegramWebView()) {
    console.log('[Init] Not in Telegram WebView — skipping SDK init');
    return;
  }

  try {
    // Базовая инициализация
    sdkInit();
    console.log('[Init] SDK initialized');

    // Монтируем viewport и после этого расширяемся
    void mountViewport()
      .then(() => {
        // Привязываем CSS-переменные Telegram к :root
        bindViewportCssVars();

        // Расширяем на всю высоту (должно быть ПОСЛЕ mount)
        expandViewport();

        // Запрашиваем полноэкранный режим (для inline web_app кнопок)
        // В deep link (t.me/bot?startapp) Telegram сам открывает fullscreen,
        // для inline button нужен явный вызов
        if (isTelegramMobile()) {
          if (!isFullscreen()) {
            requestFullscreen().catch((err: unknown) => {
              console.warn('[Init] requestFullscreen failed (non-critical):', err);
            });
            console.log('[Init] Fullscreen requested');
          } else {
            console.log('[Init] Already fullscreen');
          }
        }
      })
      .catch((err) => {
        console.warn('[Init] Viewport mount failed:', err);
        // Пробуем expand напрямую как fallback
        try {
          expandViewport();
        } catch { /* too late */ }
      });
  } catch (err) {
    console.warn('[Init] Telegram SDK init failed (non-critical):', err);
  }
}
