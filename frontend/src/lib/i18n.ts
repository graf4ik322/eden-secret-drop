import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import ru from '../locales/ru.json';

const SUPPORTED_LANGS = ['ru', 'en'];

/** Determine initial language: localStorage > Telegram language_code > 'en' */
function detectLanguage(): string {
  if (typeof window === 'undefined') return 'en';

  // 1. Explicit user preference (set via FR-18)
  const stored = localStorage.getItem('i18nextLng');
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;

  // 2. Telegram language_code from initData (FR-19)
  try {
    const tg = (window as any).Telegram?.WebApp;
    const lang = tg?.initDataUnsafe?.user?.language_code;
    if (lang && SUPPORTED_LANGS.includes(lang)) return lang;
  } catch { /* ignore */ }

  // 3. Browser language
  const browserLang = navigator.language?.split('-')[0];
  if (browserLang && SUPPORTED_LANGS.includes(browserLang)) return browserLang;

  return 'en';
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ru: { translation: ru } },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnObjects: false,
});

export default i18n;
