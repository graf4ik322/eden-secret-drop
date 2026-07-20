/**
 * EDEN Secret Drop — Telegram auth data provider.
 * 
 * Парсит initData из URL ДО инициализации SDK и HashRouter.
 * Единственный источник правды для trpc.ts и useIsAdmin.
 * 
 * Telegram Mini App передаёт данные в URL hash как tgWebAppData.
 * На Android v9.6+ window.Telegram.WebApp НЕ инжектится — 
 * единственный надёжный источник: URL hash при загрузке страницы.
 */

interface AuthData {
  initData: string;
  userId: string;
  firstName: string;
  username: string;
}

function parseAuthFromUrl(): AuthData {
  const empty: AuthData = { initData: '', userId: '', firstName: '', username: '' };
  if (typeof window === 'undefined') return empty;

  const rawHash = window.location.hash;

  const tryParse = (source: string): AuthData | null => {
    try {
      const qp = new URLSearchParams(source);
      const tgData = qp.get('tgWebAppData') || qp.get('TgWebAppData');
      if (!tgData) return null;

      const decoded = decodeURIComponent(tgData);
      const params = new URLSearchParams(decoded);
      const userStr = params.get('user');
      if (!userStr) return null;

      const user = JSON.parse(userStr);
      if (!user?.id) return null;

      return {
        initData: decoded,
        userId: String(user.id),
        firstName: user.first_name || '',
        username: user.username || '',
      };
    } catch {
      return null;
    }
  };

  // Вариант A: hash = #tgWebAppData=... (TMA native)
  if (rawHash.startsWith('#tgWebAppData') || rawHash.startsWith('#TgWebAppData')) {
    const r = tryParse(rawHash.substring(1));
    if (r) return r;
  }

  // Вариант B: hash = #/path?tgWebAppData=... (HashRouter)
  if (rawHash.includes('tgWebAppData') || rawHash.includes('TgWebAppData')) {
    // Пробуем query string часть
    const qs = rawHash.includes('?') ? rawHash.substring(rawHash.indexOf('?')) : rawHash.substring(1);
    const r1 = tryParse(qs);
    if (r1) return r1;
    // Пробуем всю строку без #
    const r2 = tryParse(rawHash.substring(1));
    if (r2) return r2;
  }

  // Вариант C: window.Telegram.WebApp (iOS/Desktop)
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
      return {
        initData: tg.initData || '',
        userId: String(tg.initDataUnsafe.user.id),
        firstName: tg.initDataUnsafe.user.first_name || '',
        username: tg.initDataUnsafe.user.username || '',
      };
    }
  } catch { /* ignore */ }

  return empty;
}

/**
 * Спарсено при импорте модуля — до того, как HashRouter или SDK модифицируют URL.
 * Это ЕДИНСТВЕННЫЙ источник auth-данных для всех компонентов.
 */
const cachedAuth: AuthData = parseAuthFromUrl();
if (cachedAuth.userId) {
  console.log('[Telegram] Auth initialized for user:', cachedAuth.userId);
}

/**
 * Возвращает кешированные Telegram auth data.
 */
export function getTelegramAuth(): AuthData {
  return cachedAuth;
}

/**
 * Сброс кеша (для debug).
 */
export function resetTelegramAuth(): void {
  // readonly — ничего не делаем
}
