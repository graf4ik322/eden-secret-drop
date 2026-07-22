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

const detectedLng = detectLanguage();

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ru: { translation: ru } },
  lng: detectedLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnObjects: false,
});

// После инициализации — загружаем свежий словарь с бэкенда (FR-04/FR-20)
if (typeof window !== 'undefined') {
  const currLng = i18n.language || detectedLng;
  fetch(`/trpc/i18n.getDictionary?input=${encodeURIComponent(JSON.stringify({ locale: currLng }))}`)
    .then(r => r.json())
    .then((data) => {
      const dict = data?.result?.data || data?.[0]?.result?.data || data;
      if (dict && typeof dict === 'object' && Object.keys(dict).length > 0) {
        i18n.addResourceBundle(currLng, 'translation', dict, true, true);
      }
    })
    .catch(() => { /* fallback to bundled JSON */ });
}

export default i18n;
