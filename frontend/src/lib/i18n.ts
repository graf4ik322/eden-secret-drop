import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import ru from '../locales/ru.json';

const SUPPORTED_LANGS = ['ru', 'en'];

function detectLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('i18nextLng');
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  try {
    const tg = (window as any).Telegram?.WebApp;
    const lang = tg?.initDataUnsafe?.user?.language_code;
    if (lang && SUPPORTED_LANGS.includes(lang)) return lang;
  } catch { /* ignore */ }
  const browserLang = navigator.language?.split('-')[0];
  if (browserLang && SUPPORTED_LANGS.includes(browserLang)) return browserLang;
  return 'en';
}

/** Convert flat dotted keys like { 'nav.home': 'Home' } to nested { nav: { home: 'Home' } } */
function unflatten(obj: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

const detectedLng = detectLanguage();

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ru: { translation: ru } },
  lng: detectedLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnObjects: false,
});

// Load dictionary from backend (overrides bundled JSON with DB values)
if (typeof window !== 'undefined') {
  const currLng = i18n.language || detectedLng;
  fetch(`/trpc/i18n.getDictionary?input=${encodeURIComponent(JSON.stringify({ locale: currLng }))}`)
    .then(r => r.json())
    .then((data) => {
      const flat = data?.result?.data || data?.[0]?.result?.data || data;
      if (flat && typeof flat === 'object' && Object.keys(flat).length > 0) {
        const nested = unflatten(flat);
        i18n.addResourceBundle(currLng, 'translation', nested, true, true);
      }
    })
    .catch(() => { /* fallback to bundled JSON */ });
}

export default i18n;
