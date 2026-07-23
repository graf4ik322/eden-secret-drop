/**
 * PWA Installer — хук и компоненты для установки PWA.
 * 
 * Android (Chrome): ловит beforeinstallprompt, показывает кнопку
 * iOS (Safari): показывает инструкцию "Share → Add to Home Screen"
 * Уже установлено: скрывает всё
 */

import { useState, useEffect, useCallback } from 'react';

interface PWAInstallState {
  /** Можно ли установить (beforeinstallprompt получен) */
  canInstall: boolean;
  /** Уже установлено как PWA */
  isInstalled: boolean;
  /** iOS устройство (нужна инструкция) */
  isIOS: boolean;
  /** Платформа */
  platform: 'ios' | 'android' | 'other';
  /** Установить (только Android) */
  install: () => Promise<void>;
  /** Пропустить/закрыть предложение */
  dismiss: () => void;
}

let deferredPrompt: any = null;
let _canInstall = false;

/**
 * Хук для управления PWA установкой.
 */
export function usePWAInstall(): PWAInstallState {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // Определяем платформу
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    setPlatform(isIOS ? 'ios' : isAndroid ? 'android' : 'other');

    // Проверяем, уже установлено ли PWA
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    };
    checkInstalled();

    // Слушаем display-mode (меняется при установке/выходе)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handler = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mediaQuery.addEventListener('change', handler);

    // Слушаем beforeinstallprompt (Chrome/Android)
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      _canInstall = true;
      setCanInstall(true);
      console.log('[PWA] beforeinstallprompt fired — install available');
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // Слушаем успешную установку
    const onInstalled = () => {
      console.log('[PWA] App installed');
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt = null;
      _canInstall = false;
    };
    window.addEventListener('appinstalled', onInstalled);

    // Если браузер уже готов показывать prompt, но мы пропустили событие
    // (бывает при медленной загрузке JS) — пробуем восстановить
    if (_canInstall && deferredPrompt) {
      setCanInstall(true);
    }

    return () => {
      mediaQuery.removeEventListener('change', handler);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    console.log('[PWA] Install result:', result.outcome);
    deferredPrompt = null;
    _canInstall = false;
    setCanInstall(false);
    if (result.outcome === 'accepted') {
      setIsInstalled(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setCanInstall(false);
  }, []);

  return {
    canInstall: canInstall && !dismissed && !isInstalled,
    isInstalled,
    isIOS: platform === 'ios',
    platform,
    install,
    dismiss,
  };
}
