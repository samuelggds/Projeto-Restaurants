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
  name: 'Pizza teste',
  price: 50,
  active: true,
  stock: null,
  saleMode: 'BUILDABLE',
  discount: null,
  ingredients: [],
  optionGroups: [],
};

function createDb({
  freeShippingMinimum = 0,
  ranges = [
    { maxDistanceKm: 2, fee: 5, active: true },
    { maxDistanceKm: 5, fee: 8, active: true },
    { maxDistanceKm: 8, fee: 12, active: true },
  ],
} = {}) {
  return {
    restaurantSettings: {
      findUnique: async () => ({
        deliveryFeeMode: 'DISTANCE',
        deliveryFee: 99,
        minimumOrder: 0,
        freeShippingMinimum,
        acceptsDelivery: true,
        acceptsPickup: true,
        tableOrderingEnabled: true,
      }),
    },
    deliveryFeeRange: {
      findFirst: async ({ where }) => {
        const minimumDistance = Number(where.maxDistanceKm.gte);
        return (
          ranges
            .filter((range) => range.active !== false && range.maxDistanceKm >= minimumDistance)
            .sort((first, second) => first.maxDistanceKm - second.maxDistanceKm)[0] ?? null
        );
      },
    },
    couponRedemption: {
      findFirst: async () => null,
    },
  };
}

test('usa a faixa correspondente à distância real da rota', async () => {
  productRepository.findById = async () => product;

  const quote = await orderPricingService.quote({
    restaurantId: 7,
    type: 'DELIVERY',
    items: [{ productId: 10, quantity: 1 }],
    deliveryDistanceMeters: 4200,
    db: createDb(),
  });

  assert.equal(quote.deliveryFeeAmount, 8);
  assert.equal(quote.deliveryDistanceMeters, 4200);
  assert.equal(quote.total, 58);
});

test('frete grátis zera o valor depois de validar uma rota dentro da área', async () => {
  productRepository.findById = async () => product;

  const quote = await orderPricingService.quote({
    restaurantId: 7,
    type: 'DELIVERY',
    items: [{ productId: 10, quantity: 2 }],
    deliveryDistanceMeters: 4200,
    db: createDb({ freeShippingMinimum: 80 }),
  });

  assert.equal(quote.deliveryFeeAmount, 0);
  assert.equal(quote.total, 100);
});

test('frete grátis não permite entrega fora da maior faixa ativa', async () => {
  productRepository.findById = async () => product;

  await assert.rejects(
    () =>
      orderPricingService.quote({
        restaurantId: 7,
        type: 'DELIVERY',
        items: [{ productId: 10, quantity: 2 }],
        deliveryDistanceMeters: 13000,
        db: createDb({ freeShippingMinimum: 80 }),
      }),
    /fora da área de entrega/,
  );
});
