import { afterEach, describe, expect, it } from 'vitest';
import {
  appendRestaurantStoreLink,
  applyHomeSeoMetadata,
  buildRestaurantStoreUrl,
  buildSocialProfileUrl,
  buildWhatsAppUrl,
  getAvailablePaymentMethods,
  normalizeHomeFontFamily,
  readPublicFeatureFlag,
  resolveAvailableFulfillmentMethod,
} from './publicSettings';

describe('configurações públicas da Home', () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
    document.querySelector('meta[name="description"]')?.remove();
  });

  it('preserva os canais de restaurantes antigos e respeita desativações explícitas', () => {
    expect(readPublicFeatureFlag({}, 'acceptsDelivery')).toBe(true);
    expect(readPublicFeatureFlag({ acceptsDelivery: false }, 'acceptsDelivery')).toBe(false);
    expect(readPublicFeatureFlag({ acceptsDelivery: true }, 'acceptsDelivery')).toBe(true);
    expect(resolveAvailableFulfillmentMethod('delivery', false, true)).toBe('pickup');
    expect(resolveAvailableFulfillmentMethod('pickup', true, false)).toBe('delivery');
  });

  it('deriva somente formas de pagamento habilitadas', () => {
    expect(
      getAvailablePaymentMethods({ allowPayOnDelivery: true, allowPix: true, allowCard: false }),
    ).toEqual(['pix', 'delivery_pix']);
  });

  it('monta o contato de WhatsApp somente com número válido e mensagem codificada', () => {
    expect(buildWhatsAppUrl('(85) 99999-0000', 'Olá, quero ajuda!')).toBe(
      'https://wa.me/85999990000?text=Ol%C3%A1%2C%20quero%20ajuda!',
    );
    expect(buildWhatsAppUrl('123', 'Olá')).toBe('');
  });

  it('anexa o endereço oficial do tenant à mensagem inicial sem permitir domínio customizado', () => {
    expect(buildRestaurantStoreUrl('North-Pizza')).toBe(
      'https://www.gastronexa.com.br/north-pizza',
    );
    expect(appendRestaurantStoreLink('Olá! Como podemos ajudar?', 'north-pizza')).toBe(
      'Olá! Como podemos ajudar?\n\nhttps://www.gastronexa.com.br/north-pizza',
    );
    expect(buildWhatsAppUrl('5585999990000', 'Olá!', 'north-pizza')).toBe(
      'https://wa.me/5585999990000?text=Ol%C3%A1!%0A%0Ahttps%3A%2F%2Fwww.gastronexa.com.br%2Fnorth-pizza',
    );
  });

  it('normaliza perfis sociais com e sem protocolo', () => {
    expect(buildSocialProfileUrl('tiktok', '@minhacasa')).toBe('https://tiktok.com/@minhacasa');
    expect(buildSocialProfileUrl('youtube', 'youtube.com/@minhacasa')).toBe(
      'https://youtube.com/@minhacasa',
    );
    expect(buildSocialProfileUrl('instagram', 'javascript:alert(1)')).toBe('');
  });

  it('limita a fonte às famílias permitidas', () => {
    expect(normalizeHomeFontFamily('Manrope')).toBe('Manrope');
    expect(normalizeHomeFontFamily('Comic Sans')).toBe('Inter');
  });

  it('preserva o nome dinâmico da aba e aplica somente a descrição SEO', () => {
    document.title = 'Pizzaria Horizonte';
    const restore = applyHomeSeoMetadata(document, 'Título para buscadores', 'Menu atualizado.');

    expect(document.title).toBe('Pizzaria Horizonte');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Menu atualizado.',
    );

    restore();
    expect(document.title).toBe('Pizzaria Horizonte');
    expect(document.querySelector('meta[name="description"]')).toBeNull();
  });
});
