import { describe, expect, it } from 'vitest';
import {
  applyRestaurantBrowserBranding,
  getRestaurantCategoryFavicon,
} from './browserBranding';

describe('browserBranding', () => {
  it('gera favicon preto e branco da categoria sem fundo', () => {
    const favicon = getRestaurantCategoryFavicon('PIZZARIA');
    const decoded = decodeURIComponent(favicon);

    expect(decoded).toContain('stroke="#111111"');
    expect(decoded).not.toContain('<rect');
    expect(decoded).not.toContain('background');
  });

  it('mantém o nome do restaurante como título e aplica o favicon da categoria', () => {
    document.title = '';
    document.querySelectorAll('link[rel~="icon"]').forEach((element) => element.remove());

    applyRestaurantBrowserBranding(document, 'North Pizza', 'PIZZARIA');

    const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    expect(document.title).toBe('North Pizza');
    expect(favicon?.type).toBe('image/svg+xml');
    expect(decodeURIComponent(favicon?.href || '')).toContain('stroke="#111111"');
  });
});
