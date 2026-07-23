/**
 * InstallPWA — компонент с кнопкой/баннером для установки PWA.
 * 
 * Android: показывает кнопку "Install App"
 * iOS: показывает инструкцию "Share → Add to Home Screen"
 * Уже установлено / отклонено: скрыт
 */

import { useState } from 'react';
import { usePWAInstall } from '@/lib/usePWAInstall';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { X, Smartphone, Download, Share2, Plus } from 'lucide-react';

/**
 * Использовать внутри страницы — компактная кнопка установки.
 */
export function InstallPWABtn() {
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
          Install App
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
                  Install EDEN
                </h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                  Add to your home screen for the best experience
                </p>
              </div>

              <div className="space-y-3">
                <Step num={1} icon={<Share2 size={18} />} text="Tap Share" />
                <Step num={2} icon={<Plus size={18} />} text="Scroll down and tap Add to Home Screen" />
                <Step num={3} icon={<Download size={18} />} text="Tap Add in the top right" />
              </div>

              <Button variant="secondary" fullWidth onClick={() => setShowIOSHelp(false)}>
                Got it
              </Button>
            </GlassCard>
          </div>
        )}
      </>
    );
  }

  // Android / другие
  return (
    <Button
      variant="secondary"
      fullWidth
      onClick={install}
    >
      <Download size={18} className="mr-2" />
      Install App
    </Button>
  );
}

/**
 * Баннер для установки — показывать на главном экране.
 */
export function InstallPWABanner() {
  const { canInstall, install, dismiss, isIOS } = usePWAInstall();
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  if (!canInstall) return null;

  if (isIOS) {
    return (
      <GlassCard className="relative p-4 mb-4 space-y-3">
        <button onClick={dismiss} className="absolute right-3 top-3 text-gray-400 hover:text-white">
          <X size={16} />
        </button>
        <div className="flex items-start gap-3">
          <Smartphone size={24} className="mt-0.5 shrink-0" style={{ color: 'var(--gold)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Install EDEN Secret Drop
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
              Add to home screen for quick access
            </p>
          </div>
        </div>
        <Button variant="ghost" fullWidth onClick={() => setShowIOSHelp(true)}>
          Show Instructions
        </Button>
        {showIOSHelp && (
          <div className="space-y-2 rounded-xl bg-white/5 p-3 text-xs" style={{ color: 'var(--muted)' }}>
            <p>1. Tap <strong>Share</strong> <Share2 size={14} className="inline" /></p>
            <p>2. Scroll down — tap <strong>Add to Home Screen</strong></p>
            <p>3. Tap <strong>Add</strong></p>
          </div>
        )}
      </GlassCard>
    );
  }

  return (
    <GlassCard className="relative p-4 mb-4 space-y-3">
      <button onClick={dismiss} className="absolute right-3 top-3 text-gray-400 hover:text-white">
        <X size={16} />
      </button>
      <div className="flex items-start gap-3">
        <Download size={24} className="mt-0.5 shrink-0" style={{ color: 'var(--emerald)' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Install EDEN Secret Drop
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
            Install as app for faster access
          </p>
        </div>
      </div>
      <Button variant="primary" fullWidth onClick={install}>
        Install
      </Button>
    </GlassCard>
  );
}

/* ===== Step indicator ===== */
function Step({ num, icon, text }: { num: number; icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: 'rgba(210,185,128,0.12)', color: 'var(--gold)' }}>
        {num}
      </div>
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {icon}
        <span>{text}</span>
      </div>
    </div>
  );
}
