import { db, translations } from '../db';
import { eq, and, like } from 'drizzle-orm';

/** Seed defaults — must match frontend/src/locales/*.json */
export const i18nDefaults: Record<string, Record<string, unknown>> = {
  en: {
    app: { name: 'EDEN Secret Drop' },
    nav: { home: 'Home', catalog: 'Catalog', studio: 'Studio', profile: 'Profile' },
    home: { featured: 'Featured Drop', latest: 'Latest Drops', allTime: 'All Time', active: 'Active', nextDrop: 'Next drop', tagline: 'Only the Best Deals —', taglineSub: 'Selected electronics for members only', featuredSubtitle: 'From Eden', featuredDesc: 'Every item is handpicked and verified. Your satisfaction is guaranteed — we stand behind every drop with our authenticity promise.', noDropsAvailable: 'No drops available yet' },
    catalog: { title: 'Catalog', search: 'Search drops...', filters: 'Filters', noResults: 'No drops found', categories: 'Category', sortBy: 'Sort by', sort: { newest: 'Newest', oldest: 'Oldest', priceLow: 'Price: Low to High', priceHigh: 'Price: High to Low' }, all: 'All' },
    drop: { live: 'LIVE', sold: 'SOLD', limited: 'LIMITED', na: 'N/A', notFound: 'Drop not found', published: 'Published {{hours}} hours ago', publishedLessThanHour: 'Published less than an hour ago', publishedHour: 'Published 1 hour ago', views: 'views', viewed: 'Viewed {{count}} times', remaining: '{{count}} remaining', inStock: 'In Stock ({{count}})', soldOut: 'Sold Out', info: 'Drop Information', estimatedDelivery: 'Estimated Delivery', deliveryText: '3-5 business days via DHL Express', buyNow: 'Buy Now', trust: { original: 'Original', warranty: 'Warranty', verified: 'Verified', fastDelivery: 'Fast Delivery' } },
    profile: { title: 'Profile', member: 'Member', admin: 'Admin', language: 'Language', memberSince: 'Member Since', selectLanguage: 'Select Language' },
    studio: { title: 'Drop Studio', drops: 'Drops', categories: 'Categories', mockups: 'Mockups', translations: 'Translations', newDrop: 'New Drop', editDrop: 'Edit Drop', joinDrop: 'Join Drop', view: 'View', addCategory: 'Add Category', addSubcategory: 'Add Subcategory', categoryName: 'Category Name', selectCategory: 'Select Category', searchPlaceholder: 'Search...', tapToUpload: 'Tap to upload', scheduledAt: 'Scheduled at', notifySubscribers: 'Notify subscribers', noMockup: 'No mockup', noDrops: 'No drops found', noCategories: 'No categories yet', parentCategory: 'Parent category', noMockups: 'No mockups yet', filterDraft: 'Draft', filterActive: 'Active', filterArchived: 'Archived', filterScheduled: 'Scheduled', status: 'Status', description: 'Description', mockup: 'Mockup' },
    mockup: { add: 'Add Mockup', edit: 'Edit Mockup' },
    common: { loading: 'Loading...', error: 'An error occurred', search: 'Search', noTranslations: 'No translations found' },
    pwa: { installApp: 'Install App', installEden: 'Install EDEN', iosInstructions: 'Add this app to your home screen for the best experience', iosStep1: 'Tap Share', iosStep2: 'Scroll down and tap Add to Home Screen', iosStep3: 'Tap Add' },
  },
  ru: {
    app: { name: 'EDEN Secret Drop' },
    nav: { home: 'Главная', catalog: 'Каталог', studio: 'Студия', profile: 'Профиль' },
    home: { featured: 'Избранный дроп', latest: 'Последние дропы', allTime: 'Всего дропов за всё время', active: 'Активных', nextDrop: 'Следующий дроп', tagline: 'Лучшие предложения —', taglineSub: 'Избранная электроника только для участников', featuredSubtitle: 'От Eden', featuredDesc: 'Каждый товар отобран вручную и верифицирован. Мы гарантируем подлинность каждого дропа.', noDropsAvailable: 'Пока нет доступных дропов' },
    catalog: { title: 'Каталог', search: 'Поиск дропов...', filters: 'Фильтры', noResults: 'Дропы не найдены', categories: 'Категория', sortBy: 'Сортировать', sort: { newest: 'Сначала новые', oldest: 'Сначала старые', priceLow: 'Цена: по возрастанию', priceHigh: 'Цена: по убыванию' }, all: 'Все' },
    drop: { live: 'LIVE', sold: 'SOLD', limited: 'LIMITED', na: 'Н/Д', notFound: 'Дроп не найден', published: 'Опубликовано {{hours}} ч. назад', publishedLessThanHour: 'Опубликовано менее часа назад', publishedHour: 'Опубликовано 1 час назад', views: 'просмотров', viewed: 'Просмотрено {{count}} раз', remaining: 'Осталось {{count}}', inStock: 'В наличии ({{count}})', soldOut: 'Распродано', info: 'Информация о дропе', estimatedDelivery: 'Ожидаемая доставка', deliveryText: '3-5 рабочих дней через DHL Express', buyNow: 'Купить сейчас', trust: { original: 'Оригинал', warranty: 'Гарантия', verified: 'Верифицировано', fastDelivery: 'Быстрая доставка' } },
    profile: { title: 'Профиль', member: 'Участник', admin: 'Администратор', language: 'Язык', memberSince: 'В сообществе с', selectLanguage: 'Выберите язык' },
    studio: { title: 'Drop Studio', drops: 'Дропы', categories: 'Категории', mockups: 'Мокапы', translations: 'Переводы', newDrop: 'Новый дроп', editDrop: 'Редактировать дроп', joinDrop: 'Присоединиться', view: 'Просмотр', addCategory: 'Добавить категорию', addSubcategory: 'Добавить подкатегорию', categoryName: 'Название категории', selectCategory: 'Выберите категорию', searchPlaceholder: 'Поиск...', tapToUpload: 'Нажмите для загрузки', scheduledAt: 'Запланировано на', notifySubscribers: 'Уведомить подписчиков', noMockup: 'Без мокапа', noDrops: 'Дропы не найдены', noCategories: 'Категорий пока нет', parentCategory: 'Родительская категория', noMockups: 'Мокапов пока нет', filterDraft: 'Черновик', filterActive: 'Активен', filterArchived: 'Архивирован', filterScheduled: 'Запланирован', status: 'Статус', description: 'Описание', mockup: 'Мокап' },
    mockup: { add: 'Добавить мокап', edit: 'Редактировать мокап' },
    common: { loading: 'Загрузка...', error: 'Произошла ошибка', search: 'Поиск', noTranslations: 'Переводы не найдены' },
    pwa: { installApp: 'Установить приложение', installEden: 'Установить EDEN', iosInstructions: 'Добавьте это приложение на главный экран для лучшего опыта', iosStep1: 'Нажмите Share', iosStep2: 'Пролистайте вниз и нажмите Add to Home Screen', iosStep3: 'Нажмите Add' },
  },
};

/** Flatten nested object into dot-notation keys */
function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, path));
    } else {
      result[path] = String(value ?? '');
    }
  }
  return result;
}

/** Get section from key (first segment before dot) */
function sectionFromKey(key: string): string {
  return key.split('.')[0] || 'other';
}

/**
 * Seed translations into DB from default JSON dictionaries.
 * Idempotent — skips existing (key, locale) pairs.
 */
export async function seedTranslations(defaults: Record<string, Record<string, unknown>>) {
  for (const [locale, dict] of Object.entries(defaults)) {
    const flat = flatten(dict as Record<string, unknown>);
    for (const [key, value] of Object.entries(flat)) {
      const existing = await db
        .select({ id: translations.id })
        .from(translations)
        .where(and(eq(translations.key, key), eq(translations.locale, locale)))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(translations).values({
          key,
          locale,
          value,
          section: sectionFromKey(key),
        });
      }
    }
  }
}

/** Get full dictionary for a locale: DB first, then empty obj */
export async function getDictionary(locale: string): Promise<Record<string, string>> {
  const rows = await db
    .select({ key: translations.key, value: translations.value })
    .from(translations)
    .where(eq(translations.locale, locale));
  const dict: Record<string, string> = {};
  for (const row of rows) {
    if (row.value) dict[row.key] = row.value;
  }
  return dict;
}

/** Get all keys grouped by section, for management UI */
export async function listKeys(groupBySection = true) {
  const rows = await db
    .select({
      id: translations.id,
      key: translations.key,
      locale: translations.locale,
      value: translations.value,
      section: translations.section,
    })
    .from(translations)
    .orderBy(translations.section, translations.key);

  // Group translations by key, showing values per locale
  const keyMap = new Map<string, {
    id: number;
    key: string;
    section: string;
    values: Record<string, string>;
  }>();

  for (const row of rows) {
    if (!keyMap.has(row.key)) {
      keyMap.set(row.key, { id: row.id, key: row.key, section: row.section || '', values: {} });
    }
    keyMap.get(row.key)!.values[row.locale] = row.value || '';
  }

  const all = Array.from(keyMap.values());

  if (!groupBySection) return all;

  // Group by section
  const groups = new Map<string, typeof all>();
  for (const item of all) {
    const section = item.section || 'other';
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section)!.push(item);
  }

  return Array.from(groups.entries()).map(([section, keys]) => ({
    section,
    keys,
    count: keys.length,
  }));
}

/** Update a single translation value */
export async function updateValue(key: string, locale: string, value: string) {
  const existing = await db
    .select({ id: translations.id })
    .from(translations)
    .where(and(eq(translations.key, key), eq(translations.locale, locale)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(translations)
      .set({ value, updatedAt: new Date() })
      .where(eq(translations.id, existing[0].id));
  } else {
    await db.insert(translations).values({
      key,
      locale,
      value,
      section: sectionFromKey(key),
    });
  }
}

/** Delete all translations for a key across all locales */
export async function deleteKey(key: string) {
  await db
    .delete(translations)
    .where(eq(translations.key, key));
}

/** Reseed: sync DB with defaults — remove keys not in defaults, add missing ones */
export async function reseed(defaults: Record<string, Record<string, unknown>>) {
  // Collect all flat keys from defaults
  const defaultKeys = new Set<string>();
  for (const [locale, dict] of Object.entries(defaults)) {
    const flat = flatten(dict as Record<string, unknown>);
    for (const key of Object.keys(flat)) {
      // If key missing in DB for this locale, insert it
      const existing = await db
        .select({ id: translations.id })
        .from(translations)
        .where(and(eq(translations.key, key), eq(translations.locale, locale)))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(translations).values({
          key,
          locale,
          value: String(flat[key] || ''),
          section: sectionFromKey(key),
        });
      }
    }
    defaultKeys.add(...Object.keys(flat));
  }

  // Remove keys from DB that are NOT in defaults
  const allDbRows = await db
    .select({ key: translations.key })
    .from(translations)
    .groupBy(translations.key);

  for (const row of allDbRows) {
    if (!defaultKeys.has(row.key)) {
      await db.delete(translations).where(eq(translations.key, row.key));
    }
  }
}
