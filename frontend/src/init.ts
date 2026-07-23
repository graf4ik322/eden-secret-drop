import {
  backButton,
  viewport,
  themeParams,
  miniApp,
  initData,
  setDebug,
  init as sdkInit,
} from '@tma.js/sdk-react';

/**
 * Initializes the Telegram Mini App SDK.
 * Безопасно вызываеться вне Telegram WebView — ошибки SDK не ломают React.
 */
export function init(debugMode: boolean): void {
  // Проверяем, запущено ли внутри Telegram WebView
  const isTelegram = typeof window !== 'undefined'
    && typeof (window as any).Telegram?.WebApp?.initData === 'string';

  if (!isTelegram) {
    console.log('[Init] Not in Telegram WebView — skipping SDK init');
    return;
  }

  try {
    setDebug(debugMode);
    sdkInit();
    backButton.mount();
    miniApp.mount();
    themeParams.mount();
    initData.restore();

    void viewport
      .mount()
      .then(() => {
        viewport.bindCssVars();
        miniApp.bindCssVars();
        themeParams.bindCssVars();
        try { (window as any).Telegram?.WebApp?.lockOrientation?.(); } catch {}
      })
      .catch((e) => {
        console.error('Something went wrong mounting the viewport', e);
      });

    viewport.expand();
  } catch (err) {
    console.warn('[Init] Telegram SDK init failed (non-critical):', err);
  }
}
