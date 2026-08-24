// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import productRepository from '../../products/repositories/ProductRepository.js';
import orderPricingService from './OrderPricingService.js';

const originalFindById = productRepository.findById;

afterEach(() => {
  productRepository.findById = originalFindById;
});

const product = {
  id: 10,
  restaurantId: 7,
  name: 'Produto promocional',
  price: 100,
  active: true,
  stock: null,
  saleMode: 'BUILDABLE',
  discount: {
    kind: 'PERCENTAGE',
    value: 20,
    active: true,
    startsAt: null,
    endsAt: null,
  },
  ingredients: [],
  optionGroups: [
    {
      id: 50,
      restaurantId: 7,
      name: 'Adicionais',
      required: false,
      selectionType: 'MULTIPLE',
      minSelections: 0,
      maxSelections: 2,
      active: true,
      options: [
        {
          id: 501,
          ingredientId: 90,
          active: true,
          ingredient: {
            id: 90,
            restaurantId: 7,
            name: 'Extra',
            price: 10,
            active: true,
          },
        },
      ],
    },
  ],
};

test('calcula promoção apenas no preço-base, cupom depois e taxa por último', async () => {
  const now = new Date('2026-08-23T15:00:00.000Z');
  productRepository.findById = async (_id, restaurantId) => {
    assert.equal(restaurantId, 7);
    return product;
  };

  const db = {
    restaurantSettings: {
      findUnique: async () => ({ deliveryFee: 5, minimumOrder: 0 }),
    },
    couponRedemption: {
      findFirst: async ({ where }) => {
        assert.equal(where.restaurantId, 7);
        assert.equal(where.userId, 42);
        assert.deepEqual(where.expiresAt, { gt: now });
        return {
          id: 300,
          restaurantId: 7,
          userId: 42,
          status: 'CLAIMED',
          expiresAt: new Date('2026-09-22T15:00:00.000Z'),
          coupon: {
            id: 80,
            restaurantId: 7,
            code: 'FIEL10',
            active: true,
            expiration: null,
            discount: 10,
            discountType: 'PERCENTAGE',
            minimumSubtotal: 0,
            maxDiscount: 15,
          },
        };
      },
    },
  };

  const quote = await orderPricingService.quote({
    restaurantId: 7,
    userId: 42,
    type: 'DELIVERY',
    couponRedemptionId: 300,
    now,
    items: [{ productId: 10, quantity: 2, optionIds: [501] }],
    db,
  });

  assert.equal(quote.orderItems[0].originalUnitPrice, 110);
  assert.equal(quote.orderItems[0].unitDiscount, 20);
  assert.equal(quote.orderItems[0].price, 90);
  assert.equal(quote.itemsSubtotal, 180);
  assert.equal(quote.productDiscountTotal, 40);
  assert.equal(quote.couponDiscount, 15);
  assert.equal(quote.deliveryFeeAmount, 5);
  assert.equal(quote.total, 170);
  assert.equal(quote.couponCode, 'FIEL10');
});

test('rejeita recompensa vencida antes de calcular o desconto', async () => {
  const now = new Date('2026-08-23T15:00:00.000Z');
  productRepository.findById = async () => product;
  const db = {
    restaurantSettings: { findUnique: async () => ({ deliveryFee: 0, minimumOrder: 0 }) },
    couponRedemption: {
      findFirst: async ({ where }) => {
        assert.equal(where.restaurantId, 7);
        assert.equal(where.userId, 42);
        assert.deepEqual(where.expiresAt, { gt: now });
        return null;
      },
    },
  };

  await assert.rejects(
    () =>
      orderPricingService.quote({
        restaurantId: 7,
        userId: 42,
        type: 'RETIRADA',
        couponRedemptionId: 300,
        items: [{ productId: 10, quantity: 1, optionIds: [501] }],
        now,
        db,
      }),
    /inválido ou indisponível/,
  );
});

test('aceita recompensa já emitida mesmo quando a campanha foi pausada depois', async () => {
  const now = new Date('2026-08-23T15:00:00.000Z');
  productRepository.findById = async () => product;
  const db = {
    restaurantSettings: { findUnique: async () => ({ deliveryFee: 0, minimumOrder: 0 }) },
    couponRedemption: {
      findFirst: async ({ where }) => {
        assert.equal(where.restaurantId, 7);
        assert.equal(where.userId, 42);
        assert.deepEqual(where.expiresAt, { gt: now });
        return {
          id: 302,
          restaurantId: 7,
          userId: 42,
          status: 'CLAIMED',
          expiresAt: new Date('2026-09-22T15:00:00.000Z'),
          coupon: {
            id: 82,
            restaurantId: 7,
            code: 'PAUSADO10',
            active: false,
            expiration: new Date('2026-09-30T15:00:00.000Z'),
            discount: 10,
            discountType: 'PERCENTAGE',
            minimumSubtotal: 0,
            maxDiscount: null,
          },
        };
      },
    },
  };

  const quote = await orderPricingService.quote({
    restaurantId: 7,
    userId: 42,
    type: 'RETIRADA',
    couponRedemptionId: 302,
    items: [{ productId: 10, quantity: 1, optionIds: [501] }],
    now,
    db,
  });

  assert.equal(quote.couponCode, 'PAUSADO10');
  assert.equal(quote.couponDiscount, 9);
  assert.equal(quote.total, 81);
});

test('preserva o expiresAt emitido quando o fim global da campanha é encurtado depois', async () => {
  const now = new Date('2026-08-23T15:00:00.000Z');
  productRepository.findById = async () => product;
  const db = {
    restaurantSettings: { findUnique: async () => ({ deliveryFee: 0, minimumOrder: 0 }) },
    couponRedemption: {
      findFirst: async ({ where }) => {
        assert.deepEqual(where, {
          id: 303,
          restaurantId: 7,
          userId: 42,
          status: 'CLAIMED',
          expiresAt: { gt: now },
        });
        return {
          id: 303,
          restaurantId: 7,
          userId: 42,
          status: 'CLAIMED',
          expiresAt: new Date('2026-09-22T15:00:00.000Z'),
          coupon: {
            id: 83,
            restaurantId: 7,
            code: 'SNAPSHOT15',
            active: true,
            expiration: new Date('2026-08-22T15:00:00.000Z'),
            discount: 15,
            discountType: 'PERCENTAGE',
            minimumSubtotal: 0,
            maxDiscount: null,
          },
        };
      },
    },
  };

  const quote = await orderPricingService.quote({
    restaurantId: 7,
    userId: 42,
    type: 'RETIRADA',
    couponRedemptionId: 303,
    items: [{ productId: 10, quantity: 1, optionIds: [501] }],
    now,
    db,
  });

  assert.equal(quote.couponCode, 'SNAPSHOT15');
  assert.equal(quote.couponDiscount, 13.5);
  assert.equal(quote.total, 76.5);
});

test('rejeita recompensa pertencente a outro cliente ou restaurante', async () => {
  productRepository.findById = async () => product;
  const db = {
    restaurantSettings: { findUnique: async () => ({ deliveryFee: 0, minimumOrder: 0 }) },
    couponRedemption: { findFirst: async () => null },
  };

  await assert.rejects(
    () =>
      orderPricingService.quote({
        restaurantId: 7,
        userId: 42,
        type: 'RETIRADA',
        couponRedemptionId: 999,
        items: [{ productId: 10, quantity: 1, optionIds: [501] }],
        db,
      }),
    /inválido ou indisponível/,
  );
});

test('soma linhas repetidas do mesmo produto antes de validar o estoque', async () => {
  productRepository.findById = async () => ({ ...product, stock: 5 });
  const db = {
    restaurantSettings: { findUnique: async () => ({ deliveryFee: 0, minimumOrder: 0 }) },
    couponRedemption: { findFirst: async () => null },
  };

  await assert.rejects(
    () =>
      orderPricingService.quote({
        restaurantId: 7,
        userId: 42,
        type: 'RETIRADA',
        items: [
          { productId: 10, quantity: 3, optionIds: [501] },
          { productId: 10, quantity: 3, optionIds: [501] },
        ],
        db,
      }),
    /Estoque insuficiente.*Disponível: 5/,
  );
});

test('não reserva recompensa quando o arredondamento produzir desconto zero', async () => {
  productRepository.findById = async () => ({
    ...product,
    price: 0.01,
    discount: null,
    optionGroups: product.optionGroups.map((group) => ({
      ...group,
      options: group.options.map((option) => ({
        ...option,
        ingredient: { ...option.ingredient, price: 0 },
      })),
    })),
  });
  const db = {
    restaurantSettings: { findUnique: async () => ({ deliveryFee: 0, minimumOrder: 0 }) },
    couponRedemption: {
      findFirst: async () => ({
        id: 301,
        restaurantId: 7,
        userId: 42,
        status: 'CLAIMED',
        coupon: {
          id: 81,
          restaurantId: 7,
          code: 'UMCENTAVO',
          active: true,
          expiration: null,
          discount: 1,
          discountType: 'PERCENTAGE',
          minimumSubtotal: 0,
          maxDiscount: null,
        },
      }),
    },
  };

  await assert.rejects(
    () =>
      orderPricingService.quote({
        restaurantId: 7,
        userId: 42,
        type: 'RETIRADA',
        couponRedemptionId: 301,
        items: [{ productId: 10, quantity: 1, optionIds: [501] }],
        db,
      }),
    /não gera desconto/i,
  );
});

test('zera a taxa quando o subtotal alcança o valor de frete grátis', async () => {
  productRepository.findById = async () => product;
  const db = {
    restaurantSettings: {
      findUnique: async () => ({
        deliveryFee: 12,
        minimumOrder: 0,
        freeShippingMinimum: 80,
        acceptsDelivery: true,
      }),
    },
    couponRedemption: { findFirst: async () => null },
  };

  const quote = await orderPricingService.quote({
    restaurantId: 7,
    type: 'DELIVERY',
    items: [{ productId: 10, quantity: 1, optionIds: [501] }],
    db,
  });

  assert.equal(quote.itemsSubtotal, 90);
  assert.equal(quote.deliveryFeeAmount, 0);
  assert.equal(quote.total, 90);
});

test('rejeita canais desativados nas configurações do restaurante', async () => {
  productRepository.findById = async () => product;

  const scenarios = [
    {
      type: 'DELIVERY',
      settings: { acceptsDelivery: false },
      message: /não está aceitando pedidos para delivery/i,
    },
    {
      type: 'RETIRADA',
      settings: { acceptsPickup: false },
      message: /não está aceitando pedidos para retirada/i,
    },
    {
      type: 'MESA',
      settings: { tableOrderingEnabled: false },
      message: /cardápio de mesa estão desativados/i,
    },
  ];

  for (const scenario of scenarios) {
    const db = {
      restaurantSettings: {
        findUnique: async () => ({
          deliveryFee: 0,
          minimumOrder: 0,
          acceptsDelivery: true,
          acceptsPickup: true,
          tableOrderingEnabled: true,
          ...scenario.settings,
        }),
      },
      couponRedemption: { findFirst: async () => null },
    };

    await assert.rejects(
      () =>
        orderPricingService.quote({
          restaurantId: 7,
          type: scenario.type,
          items: [{ productId: 10, quantity: 1, optionIds: [501] }],
          db,
        }),
      scenario.message,
    );
  }
});
