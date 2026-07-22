import { db, translations } from '../db';
import { eq, and, like } from 'drizzle-orm';

/** Seed defaults — must match frontend/src/locales/*.json */
export const i18nDefaults: Record<string, Record<string, unknown>> = {
  en: {
    app: { name: 'EDEN Secret Drop' },
    nav: { home: 'Home', catalog: 'Catalog', studio: 'Studio', profile: 'Profile' },
    home: { featured: 'Featured Drop', latest: 'Latest Drops', noDrops: 'No drops yet', noDropsAvailable: 'No drops available yet', allTime: 'All Time', active: 'Active', nextDrop: 'Next drop', settings: 'Settings' },
    catalog: { title: 'Catalog', search: 'Search drops...', filters: 'Filters', noResults: 'No drops found', sort: { newest: 'Newest', oldest: 'Oldest', priceLow: 'Price: Low to High', priceHigh: 'Price: High to Low' }, categories: 'Categories', all: 'All' },
    drop: { live: 'LIVE', sold: 'SOLD', limited: 'LIMITED', priceOnRequest: 'Price on request', description: 'Description', specifications: 'Specifications', brand: 'Brand', category: 'Category', views: 'views', published: 'Published {{hours}} hours ago', publishedLessThanHour: 'Published less than an hour ago', publishedHour: 'Published 1 hour ago', trust: { original: 'Original', warranty: 'Warranty', verified: 'Verified', fastDelivery: 'Fast Delivery' }, shareText: '🔥 {{title}} \u2014 \u20ac{{price}}' },
    profile: { title: 'Profile', member: 'Member', admin: 'Admin', userId: 'User ID', username: 'Username', language: 'Language', memberSince: 'Member Since', memberSinceDate: 'July 2026', languages: { ru: 'Русский', en: 'English' }, selectLanguage: 'Select Language', notifications: 'Notifications', about: 'About' },
    studio: { title: 'Drop Studio', drops: 'Drops', categories: 'Categories', mockups: 'Mockups' },
    common: { loading: 'Loading...', error: 'An error occurred', close: 'Close', back: 'Back', save: 'Save', cancel: 'Cancel', delete: 'Delete', confirm: 'Confirm', select: 'Select', noCategory: 'No category' },
    subscriber: { welcome: 'Welcome! You are now registered.', openApp: 'Open EDEN' },
  },
  ru: {
    app: { name: 'EDEN Secret Drop' },
    nav: { home: 'Home', catalog: 'Catalog', studio: 'Studio', profile: 'Profile' },
    home: { featured: 'Избранный дроп', latest: 'Последние дропы', noDrops: 'Ещё нет дропов', noDropsAvailable: 'Пока нет доступных дропов', allTime: 'За всё время', active: 'Активных', nextDrop: 'Следующий дроп', settings: 'Настройки' },
    catalog: { title: 'Каталог', search: 'Поиск дропов...', filters: 'Фильтры', noResults: 'Дропы не найдены', sort: { newest: 'Сначала новые', oldest: 'Сначала старые', priceLow: 'Цена: по возрастанию', priceHigh: 'Цена: по убыванию' }, categories: 'Категории', all: 'Все' },
    drop: { live: 'LIVE', sold: 'SOLD', limited: 'LIMITED', priceOnRequest: 'Цена по запросу', description: 'Описание', specifications: 'Характеристики', brand: 'Бренд', category: 'Категория', views: 'просмотров', published: 'Опубликовано {{hours}} ч. назад', publishedLessThanHour: 'Опубликовано менее часа назад', publishedHour: 'Опубликовано 1 час назад', trust: { original: 'Original', warranty: 'Warranty', verified: 'Verified', fastDelivery: 'Fast Delivery' }, shareText: '🔥 {{title}} \\u2014 \\u20ac{{price}}' },
    profile: { title: 'Профиль', member: 'Участник', admin: 'Админ', userId: 'ID пользователя', username: 'Имя пользователя', language: 'Язык', memberSince: 'Участник с', memberSinceDate: 'July 2026', languages: { ru: 'Русский', en: 'English' }, selectLanguage: 'Выберите язык', notifications: 'Уведомления', about: 'О приложении' },
    studio: { title: 'Drop Studio', drops: 'Дропы', categories: 'Категории', mockups: 'Мокапы' },
    common: { loading: 'Загрузка...', error: 'Произошла ошибка', close: 'Закрыть', back: 'Назад', save: 'Сохранить', cancel: 'Отмена', delete: 'Удалить', confirm: 'Подтвердить', select: 'Выбрать', noCategory: 'Без категории' },
    subscriber: { welcome: 'Добро пожаловать! Вы зарегистрированы.', openApp: 'Открыть EDEN' },
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
