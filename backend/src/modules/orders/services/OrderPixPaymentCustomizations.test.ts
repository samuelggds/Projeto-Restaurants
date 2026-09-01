// @ts-nocheck
import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../../../config/prisma.js';
import productRepository from '../../products/repositories/ProductRepository.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { BUSINESS_DAY_IDS } from '../../restaurantSettings/utils/businessHours.js';
import orderPixPaymentService from './OrderPixPaymentService.js';

const originalFindById = productRepository.findById;
const originalFindPublicSettings = restaurantSettingsRepository.findPublicByRestaurantId;
const originalTransaction = prisma.$transaction;

beforeEach(() => {
  prisma.$transaction = async (callback) => callback({ $queryRaw: async () => [] });
});

afterEach(() => {
  prisma.$transaction = originalTransaction;
  productRepository.findById = originalFindById;
  restaurantSettingsRepository.findPublicByRestaurantId = originalFindPublicSettings;
});

const configurableProduct = {
  id: 10,
  restaurantId: 7,
  name: 'Pizza da casa',
  saleMode: 'BUILDABLE',
  price: 30,
  active: true,
  ingredients: [],
  optionGroups: [
    {
      id: 100,
      restaurantId: 7,
      name: 'Massa',
      required: true,
      selectionType: 'SINGLE',
      minSelections: 1,
      maxSelections: 1,
      active: true,
      options: [
        {
          id: 1001,
          ingredientId: 11,
          active: true,
          ingredient: {
            id: 11,
            restaurantId: 7,
            name: 'Massa fina',
            price: 0,
            active: true,
          },
        },
      ],
    },
    {
      id: 200,
      restaurantId: 7,
      name: 'Adicionais',
      required: false,
      selectionType: 'MULTIPLE',
      minSelections: 0,
      maxSelections: 3,
      active: true,
      options: [
        {
          id: 2001,
          ingredientId: 21,
          active: true,
          ingredient: {
            id: 21,
            restaurantId: 7,
            name: 'Bacon',
            price: 5.5,
            active: true,
          },
        },
      ],
    },
  ],
};

test('não gera cobrança PIX fora da agenda semanal', async () => {
  restaurantSettingsRepository.findPublicByRestaurantId = async () => ({
    isOpenForOrders: true,
    businessHours: BUSINESS_DAY_IDS.map((id) => ({
      id,
      label: id,
      enabled: false,
      openingTime: '11:00',
      closingTime: '23:00',
    })),
  });

  await assert.rejects(
    () =>
      orderPixPaymentService.createPixPayment({
        restaurantId: 7,
        type: 'RETIRADA',
        paymentMethod: 'PIX',
        items: [],
      }),
    /restaurante está fechado/i,
  );
});

test('subtotal PIX inclui adicionais da montagem usando preços do restaurante', async () => {
  productRepository.findById = async (productId, restaurantId) => {
    assert.equal(productId, 10);
    assert.equal(restaurantId, 7);
    return configurableProduct;
  };

  const subtotal = await orderPixPaymentService.calculateOrderSubtotal({
    restaurantId: 7,
    items: [
      {
        productId: 10,
        quantity: 2,
        optionIds: [1001, 2001],
        selectedOptions: [
          { groupId: 100, optionIds: [1001] },
          { groupId: 200, optionIds: [2001] },
        ],
      },
    ],
  });

  assert.equal(subtotal, 71);
});

test('subtotal PIX rejeita opção de outro grupo ou restaurante', async () => {
  productRepository.findById = async () => configurableProduct;

  await assert.rejects(
    () =>
      orderPixPaymentService.calculateOrderSubtotal({
        restaurantId: 7,
        items: [
          {
            productId: 10,
            quantity: 1,
            selectedOptions: [{ groupId: 100, optionIds: [2001] }],
          },
        ],
      }),
    /não pertence ao grupo Massa/,
  );
});
