import { describe, expect, it } from 'vitest';
import {
  applyPlatformBrowserFavicon,
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
    applyPlatformBrowserFavicon(document);

    applyRestaurantBrowserBranding(document, 'North Pizza', 'PIZZARIA');

    const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    expect(document.title).toBe('North Pizza');
    expect(favicon?.type).toBe('image/svg+xml');
    expect(favicon?.getAttribute('sizes')).toBe('any');
    expect(decodeURIComponent(favicon?.href || '')).toContain('stroke="#111111"');
  });

  it('restaura o favicon quadrado ao voltar do restaurante para a plataforma', () => {
    applyRestaurantBrowserBranding(document, 'North Pizza', 'PIZZARIA');
    document.title = 'GastroNexa | Gestão completa para restaurantes';

    applyPlatformBrowserFavicon(document);

    const favicons = document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]');
    expect(favicons).toHaveLength(1);
    expect(favicons[0].getAttribute('href')).toBe('/favicon.png');
    expect(favicons[0].type).toBe('image/png');
    expect(favicons[0].getAttribute('sizes')).toBe('96x96');
    expect(document.title).toBe('GastroNexa | Gestão completa para restaurantes');
  });
});
