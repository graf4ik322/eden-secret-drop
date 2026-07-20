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
 */
export function init(debugMode: boolean): void {
  // Set debug mode
  setDebug(debugMode);

  // Initialize SDK
  sdkInit();

  // Mount main components
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
    })
    .catch((e) => {
      console.error('Something went wrong mounting the viewport', e);
    });

  // Expand viewport to full height
  viewport.expand();
}
