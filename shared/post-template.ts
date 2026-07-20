/**
 * Standardized post template for Telegram channel (TZ 2.4).
 */

export interface PostTemplateData {
  displayId: string;
  title: string;
  price: string;
  description: string;
  brand?: string;
  categoryName?: string;
  imageUrl: string;
  status: string;
  miniAppUrl: string;
}

export function renderPostCaption(data: PostTemplateData): string {
  return [
    `🏆 ${data.title}`,
    '',
    `💰 ${data.price}`,
    data.brand ? `🏷️ Brand: ${data.brand}` : null,
    data.categoryName ? `📂 Category: ${data.categoryName}` : null,
    '',
    data.description,
    '',
    `━━━━━━━━━━━━━━`,
    `🔗 EDEN Secret Drop \u2014 ID: ${data.displayId}`,
    '',
    `<a href="${data.miniAppUrl}">🔐 Open in Mini App</a>`,
  ].filter(Boolean).join('\n');
}
