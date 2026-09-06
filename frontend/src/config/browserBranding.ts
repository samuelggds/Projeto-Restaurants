import { normalizeRestaurantCategory, type RestaurantCategory } from './restaurantCategory';

export const RESTAURANT_BROWSER_BRANDING_UPDATED_EVENT =
  'pecajaf:restaurant-browser-branding-updated';

export const DEFAULT_BROWSER_TITLE = 'Peça Já Food';

const CATEGORY_ICON_MARKUP: Record<RestaurantCategory, string> = {
  RESTAURANTE:
    '<path d="M8 5v8M12 5v8M8 9h4M10 13v14M21 5v22M18 5c0 4.5 1 7 3 7s3-2.5 3-7"/>',
  PIZZARIA:
    '<path d="M5 26 16 5l11 21Z"/><path d="M8.5 20.5c5 2.2 10 2.2 15 0"/><circle cx="14" cy="15" r="1.7"/><circle cx="20" cy="19" r="1.7"/>',
  HAMBURGUERIA:
    '<path d="M6 14c.8-5 4.6-8 10-8s9.2 3 10 8H6Z"/><path d="M5 17h22M7 21h18M7 21c.6 3.2 2.5 5 5.5 5h7c3 0 4.9-1.8 5.5-5"/>',
  ACAITERIA:
    '<path d="M6 14h20c-.8 7.5-4.3 12-10 12S6.8 21.5 6 14Z"/><path d="M9 14c.8-4 3.2-6 7-6s6.2 2 7 6M20 8l4-4"/><circle cx="12" cy="11" r="1.3"/><circle cx="17" cy="10" r="1.3"/>',
  CAFETERIA:
    '<path d="M7 10h15v8c0 5-3 8-7.5 8S7 23 7 18v-8Z"/><path d="M22 12h2.5a3.5 3.5 0 0 1 0 7H22M11 6c0-2 2-2 2-4M17 6c0-2 2-2 2-4"/>',
  JAPONESA:
    '<ellipse cx="16" cy="9" rx="8" ry="4"/><path d="M8 9v13c0 2.2 3.6 4 8 4s8-1.8 8-4V9"/><ellipse cx="16" cy="9" rx="3.5" ry="1.7"/><path d="M8 19c4 2 12 2 16 0"/>',
  CHURRASCARIA:
    '<path d="M17 4c2 5-2 6-1 10 1-2 3-3 5-3 2 3 4 5 4 9a9 9 0 0 1-18 0c0-4 2-7 6-11 0 3 1 5 3 6-1-5 1-8 1-11Z"/><path d="M13 24c0-3 1-5 4-7 0 3 2 4 2 7"/>',
  DOCERIA:
    '<path d="M9 14h14l-1.5 12h-11Z"/><path d="M10 14c0-3 2-5 5-5 .5-3 5-4 6.5-1.5 2.5.2 4.5 2.2 4.5 4.7 0 .7-.1 1.2-.3 1.8H10Z"/><path d="M14 18v5M18 18v5"/>',
  LANCHONETE:
    '<path d="M6 12 16 6l10 6-10 6Z"/><path d="m6 18 10 6 10-6M6 12v6M26 12v6"/><path d="m10 16 6 3.5 6-3.5"/>',
  PADARIA:
    '<path d="M6 19c0-7 4-12 10-12s10 5 10 12v3c0 2.2-1.8 4-4 4H10c-2.2 0-4-1.8-4-4v-3Z"/><path d="m11 10 3 4M16 8l2 5M21 10l-1 4"/>',
  OUTRO:
    '<path d="M6 11h20l-2-6H8Z"/><path d="M7 11v15h18V11M12 26v-8h8v8"/><path d="M6 11c0 2 1.5 3 3.5 3S13 13 13 11c0 2 1.5 3 3 3s3-1 3-3c0 2 1.5 3 3.5 3S26 13 26 11"/>',
};

function buildCategorySvg(category: RestaurantCategory) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="#111111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${CATEGORY_ICON_MARKUP[category]}</svg>`;
}

export function getRestaurantCategoryFavicon(value: unknown) {
  const category = normalizeRestaurantCategory(value);
  return `data:image/svg+xml,${encodeURIComponent(buildCategorySvg(category))}`;
}

export function applyRestaurantBrowserBranding(
  targetDocument: Document,
  restaurantName: unknown,
  category: unknown,
) {
  const title = String(restaurantName || '').trim() || DEFAULT_BROWSER_TITLE;
  targetDocument.title = title;

  let favicon = targetDocument.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!favicon) {
    favicon = targetDocument.createElement('link');
    favicon.rel = 'icon';
    targetDocument.head.appendChild(favicon);
  }

  favicon.type = 'image/svg+xml';
  favicon.href = getRestaurantCategoryFavicon(category);
}

export function notifyRestaurantBrowserBrandingUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(RESTAURANT_BROWSER_BRANDING_UPDATED_EVENT));
  }
}
