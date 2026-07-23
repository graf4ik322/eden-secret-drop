/**
 * InstallPWA — компонент с кнопкой/баннером для установки PWA.
 * 
 * Android: показывает кнопку "Install App"
 * iOS: показывает инструкцию "Share → Add to Home Screen"
 * Уже установлено / отклонено: скрыт
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePWAInstall } from '@/lib/usePWAInstall';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { X, Smartphone, Download } from 'lucide-react';

/**
 * Использовать внутри страницы — компактная кнопка установки.
 */
export function InstallPWABtn() {
  const { t } = useTranslation();
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  if (isInstalled || !canInstall) return null;

  if (isIOS) {
    return (
      <>
        <Button
          variant="ghost"
          fullWidth
          onClick={() => setShowIOSHelp(true)}
          className="mt-4"
        >
          <Smartphone size={18} className="mr-2" />
          {t('pwa.installApp')}
        </Button>

        {showIOSHelp && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 pb-12 safe-bottom">
            <GlassCard className="relative w-full max-w-sm p-6 space-y-4">
              <button
                onClick={() => setShowIOSHelp(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="text-center">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                  {t('pwa.installEden')}
                </h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                  {t('pwa.iosInstructions')}
                </p>
              </div>
              <ol className="space-y-3 text-sm" style={{ color: 'var(--text)' }}>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0" 
                    style={{ background: 'var(--gold)', color: 'var(--bg)' }}>1</span>
                  <span>{t('pwa.iosStep1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0" 
                    style={{ background: 'var(--gold)', color: 'var(--bg)' }}>2</span>
                  <span>{t('pwa.iosStep2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0" 
                    style={{ background: 'var(--gold)', color: 'var(--bg)' }}>3</span>
                  <span>{t('pwa.iosStep3')}</span>
                </li>
              </ol>
            </GlassCard>
          </div>
        )}
      </>
    );
  }

  return (
    <Button
      variant="primary"
      fullWidth
      onClick={install}
      className="mt-4"
    >
      <Download size={18} className="mr-2" />
      {t('pwa.installApp')}
    </Button>
  );
}
