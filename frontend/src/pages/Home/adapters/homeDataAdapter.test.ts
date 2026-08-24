import { describe, expect, it } from 'vitest';
import { defaultBusinessHours } from '../../admin/data';
import { buildHomeData, mapProductPricingFromApi, resolveProductImage } from './homeDataAdapter';

describe('homeDataAdapter', () => {
  it('preserva a imagem real do produto', () => {
    expect(resolveProductImage({ image: 'https://cdn.test/pizza.webp' }, 0)).toBe(
      'https://cdn.test/pizza.webp',
    );
  });
  it('mantém produtos sem estoque visíveis, mas indisponíveis, e cria categorias únicas', () => {
    const data = buildHomeData(
      [
        { id: 1, name: 'Pizza A', price: 20, stock: 2, category: { name: 'Pizzas' } },
        { id: 2, name: 'Pizza B', price: 30, stock: 0, category: { name: 'Pizzas' } },
        { id: 3, name: 'Suco', price: 8, stock: null, category: { name: 'Bebidas' } },
      ],
      null,
    );
    expect(data.products.map((product) => product.id)).toEqual(['1', '2', '3']);
    expect(data.products.map((product) => product.available)).toEqual([true, false, true]);
    expect(data.categories.map((category) => category.name)).toEqual([
      'Todos',
      'Pizzas',
      'Bebidas',
    ]);
  });
  it('monta marca e os três banners configurados', () => {
    const data = buildHomeData([], {
      restaurant: {
        name: 'North Pizza',
        logo: 'https://cdn.test/logo.png',
        banners: [
          { title: 'Banner principal', image: 'https://cdn.test/main.png' },
          { title: 'Promoção 1', image: 'https://cdn.test/promo1.png' },
          { title: 'Promoção 2', image: 'https://cdn.test/promo2.png' },
        ],
      },
    });
    expect(data.brand).toMatchObject({ name: 'North Pizza', monogram: 'NP' });
    expect(data.hero.image).toContain('main.png');
    expect(data.banners).toHaveLength(0);
  });

  it('combina o controle manual com a agenda persistida', () => {
    const data = buildHomeData(
      [],
      {
        isOpenForOrders: true,
        businessHours: defaultBusinessHours.map((day) => ({ ...day, enabled: false })),
      },
      new Date('2026-08-09T21:00:00.000Z'),
    );

    expect(data.isOpenForOrders).toBe(true);
    expect(data.isOpen).toBe(false);
  });

  it('mantém compatibilidade manual quando o restaurante ainda não cadastrou uma agenda', () => {
    const data = buildHomeData([], { isOpenForOrders: true }, new Date('2026-08-09T21:00:00.000Z'));
    expect(data.isOpen).toBe(true);
    expect(data.businessHours).toBeUndefined();
  });

  it('mapeia canais, frete, contato, redes, fonte e SEO persistidos', () => {
    const data = buildHomeData([], {
      acceptsDelivery: false,
      acceptsPickup: true,
      acceptsPix: false,
      acceptsCard: true,
      freeShippingMinimum: 75,
      whatsapp: '+55 (85) 99999-0000',
      whatsappEnabled: true,
      whatsappDisplayName: 'Atendimento da Casa',
      whatsappDefaultMessage: 'Olá, quero pedir.',
      tiktok: '@casateste',
      youtube: 'youtube.com/@casateste',
      fontFamily: 'DM Sans',
      seoTitle: 'Casa Teste | Cardápio',
      seoDescription: 'Peça diretamente no nosso cardápio.',
    });

    expect(data).toMatchObject({
      acceptsDelivery: false,
      acceptsPickup: true,
      acceptsPix: false,
      acceptsCard: true,
      freeDeliveryFrom: 75,
      fontFamily: 'DM Sans',
      seoTitle: 'Casa Teste | Cardápio',
      seoDescription: 'Peça diretamente no nosso cardápio.',
    });
    expect(data.brand).toMatchObject({
      whatsapp: '5585999990000',
      whatsappDisplayName: 'Atendimento da Casa',
      whatsappDefaultMessage: 'Olá, quero pedir.',
      tiktok: '@casateste',
      youtube: 'youtube.com/@casateste',
    });
  });

  it('oculta o WhatsApp quando a integração está explicitamente desativada', () => {
    const data = buildHomeData([], {
      whatsapp: '5585999990000',
      whatsappEnabled: false,
    });
    expect(data.brand.whatsapp).toBe('');
  });

  it('mantém padrões seguros para respostas de servidores antigos', () => {
    const data = buildHomeData([], { whatsapp: '5585999990000' });
    expect(data).toMatchObject({
      acceptsDelivery: true,
      acceptsPickup: true,
      acceptsPix: true,
      acceptsCard: true,
      freeDeliveryFrom: 0,
      fontFamily: 'Inter',
    });
    expect(data.brand.whatsapp).toBe('5585999990000');
  });

  it('usa somente o preço promocional calculado pelo servidor', () => {
    expect(
      mapProductPricingFromApi({
        price: 50,
        pricing: {
          active: true,
          originalBasePrice: 50,
          effectiveBasePrice: 37.5,
          discountAmount: 12.5,
          discountPercentage: 25,
          badgeLabel: 'Oferta da semana',
        },
      }),
    ).toEqual({
      originalBasePrice: 50,
      effectiveBasePrice: 37.5,
      promotion: {
        active: true,
        discountAmount: 12.5,
        discountPercentage: 25,
        badgeLabel: 'Oferta da semana',
        endsAt: undefined,
      },
    });
    expect(
      mapProductPricingFromApi({
        price: 50,
        pricing: { active: false, originalBasePrice: 50, effectiveBasePrice: 1 },
      }).effectiveBasePrice,
    ).toBe(50);
  });
});
