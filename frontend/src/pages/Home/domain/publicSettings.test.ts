import { afterEach, describe, expect, it } from 'vitest';
import {
  applyHomeSeoMetadata,
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

  it('aplica e restaura título e descrição SEO sem deixar metadados órfãos', () => {
    document.title = 'Título original';
    const restore = applyHomeSeoMetadata(document, 'Restaurante do Bairro', 'Menu atualizado.');

    expect(document.title).toBe('Restaurante do Bairro');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Menu atualizado.',
    );

    restore();
    expect(document.title).toBe('Título original');
    expect(document.querySelector('meta[name="description"]')).toBeNull();
  });
});
