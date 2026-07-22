import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, Home, Package, Folder, Languages } from 'lucide-react';
import { Drawer } from '@/components/ui';
import { useTranslation } from 'react-i18next';

const DRAWER_ITEMS = [
  { id: 'drops', labelKey: 'studio.drops', icon: Package, path: '/studio/drops' },
  { id: 'categories', labelKey: 'studio.categories', icon: Folder, path: '/studio/categories' },
  { id: 'mockups', labelKey: 'studio.mockups', icon: Package, path: '/studio/mockups' },
  { id: 'translations', labelKey: 'Переводы', icon: Languages, path: '/studio/translations' },
];

export function StudioLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t } = useTranslation();

  const currentPath = location.pathname;

  return (
    <div className="min-h-dvh safe-top scroll-safe">
      <header className="app-header flex items-center justify-between px-4 relative">
        <button onClick={() => setDrawerOpen(true)}
          className="w-11 h-11 rounded-full glass-card flex items-center justify-center transition-all flex-shrink-0">
          <Menu size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Drop Studio</h1>
        <button onClick={() => navigate('/')}
          className="w-11 h-11 rounded-full glass-card flex items-center justify-center transition-all flex-shrink-0">
          <Home size={20} style={{ color: 'var(--gold)' }} />
        </button>
      </header>

      {/* Drawer navigation */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="flex flex-col gap-1">
          {DRAWER_ITEMS.map((item) => (
            <button key={item.id} onClick={() => {
              navigate(item.path);
              setDrawerOpen(false);
            }}
              className={`flex items-center gap-3 px-4 h-12 rounded-xl text-sm font-medium transition-all ${
                currentPath === item.path
                  ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[#071A17]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
              }`}
            >
              <item.icon size={18} />
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </Drawer>

      {children}
    </div>
  );
}
