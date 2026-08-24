// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { OrderType, PaymentMethod, Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import productRepository from '../../products/repositories/ProductRepository.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { BUSINESS_DAY_IDS } from '../../restaurantSettings/utils/businessHours.js';

const originalHttpCreateServer = http.createServer;
http.createServer = ((...args) => {
  const server = originalHttpCreateServer(...args);
  server.listen = () => server;
  return server;
}) as typeof http.createServer;

const { default: createOrderService } = await import('./CreateOrderService.js');
http.createServer = originalHttpCreateServer;

const originals = {
  transaction: prisma.$transaction,
  countActiveOperationalOrders: orderRepository.countActiveOperationalOrders,
  createOrder: orderRepository.create,
  findOrderById: orderRepository.findById,
  findProductById: productRepository.findById,
  findSettings: restaurantSettingsRepository.findByRestaurantId,
};

afterEach(() => {
  prisma.$transaction = originals.transaction;
  orderRepository.countActiveOperationalOrders = originals.countActiveOperationalOrders;
  orderRepository.create = originals.createOrder;
  orderRepository.findById = originals.findOrderById;
  productRepository.findById = originals.findProductById;
  restaurantSettingsRepository.findByRestaurantId = originals.findSettings;
});

test('bloqueia a criação do pedido fora da agenda semanal', async () => {
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    isOpenForOrders: true,
    businessHours: BUSINESS_DAY_IDS.map((id) => ({
      id,
      label: id,
      enabled: false,
      openingTime: '11:00',
      closingTime: '23:00',
    })),
    autoAcceptOrders: false,
    maxConcurrentOrders: 20,
  });

  await assert.rejects(
    () =>
      createOrderService.execute({
        userId: 42,
        restaurantId: 7,
        userRestaurantId: 7,
        type: OrderType.RETIRADA,
        paymentMethod: PaymentMethod.DINHEIRO,
        paid: false,
        items: [{ productId: 10, quantity: 1 }],
      }),
    /restaurante está fechado/i,
  );
});

test('persiste opções agrupadas e observação do item no createMany do pedido', async () => {
  let persistedItems = null;
  const tx = {
    restaurantSettings: {
      findUnique: async () => ({ deliveryFee: 0, minimumOrder: 0 }),
    },
    orderItem: {
      createMany: async ({ data }) => {
        persistedItems = data;
        return { count: data.length };
      },
    },
    product: {
      update: async () => {
        throw new Error('Produto com estoque ilimitado não deve ser atualizado.');
      },
    },
  };

  prisma.$transaction = async (callback, options) => {
    assert.equal(options?.isolationLevel, Prisma.TransactionIsolationLevel.Serializable);
    return callback(tx);
  };
  restaurantSettingsRepository.findByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    return { isOpenForOrders: true, autoAcceptOrders: false, maxConcurrentOrders: 20 };
  };
  orderRepository.countActiveOperationalOrders = async (restaurantId, database) => {
    assert.equal(restaurantId, 7);
    assert.equal(database, tx);
    return 0;
  };
  productRepository.findById = async (productId, restaurantId, database) => {
    assert.equal(productId, 10);
    assert.equal(restaurantId, 7);
    assert.equal(database, tx);
    return {
      id: 10,
      restaurantId: 7,
      name: 'Pizza da casa',
      saleMode: 'BUILDABLE',
      price: 30,
      active: true,
      stock: null,
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
  };
  orderRepository.create = async (data, database) => {
    assert.equal(database, tx);
    assert.equal(data.restaurantId, 7);
    assert.equal(Number(data.total), 71);
    return { id: 321, restaurantId: 7, userId: 42, status: 'PENDENTE' };
  };
  orderRepository.findById = async (orderId, restaurantId, database) => {
    assert.equal(orderId, 321);
    assert.equal(restaurantId, 7);
    assert.equal(database, tx);
    return {
      id: 321,
      restaurantId: 7,
      userId: 42,
      status: 'PENDENTE',
      items: persistedItems,
    };
  };

  const order = await createOrderService.execute({
    userId: 42,
    restaurantId: 7,
    userRestaurantId: 7,
    type: OrderType.RETIRADA,
    paymentMethod: PaymentMethod.DINHEIRO,
    paid: false,
    items: [
      {
        productId: 10,
        quantity: 2,
        optionIds: [1001, 2001],
        selectedOptions: [
          { groupId: 100, optionIds: [1001] },
          { groupId: 200, optionIds: [2001] },
        ],
        observation: '  assar bem e não cortar  ',
      },
    ],
  });

  assert.equal(order.id, 321);
  assert.deepEqual(persistedItems, [
    {
      orderId: 321,
      productId: 10,
      quantity: 2,
      price: 35.5,
      originalUnitPrice: 35.5,
      unitDiscount: 0,
      observation: 'assar bem e não cortar',
      ingredients: [
        { id: 11, name: 'Massa fina', price: 0 },
        { id: 21, name: 'Bacon', price: 5.5 },
      ],
      customizations: [
        {
          groupId: 100,
          groupName: 'Massa',
          selectionType: 'SINGLE',
          minSelections: 1,
          maxSelections: 1,
          options: [
            {
              optionId: 1001,
              ingredientId: 11,
              name: 'Massa fina',
              price: 0,
            },
          ],
        },
        {
          groupId: 200,
          groupName: 'Adicionais',
          selectionType: 'MULTIPLE',
          minSelections: 0,
          maxSelections: 3,
          options: [
            {
              optionId: 2001,
              ingredientId: 21,
              name: 'Bacon',
              price: 5.5,
            },
          ],
        },
      ],
    },
  ]);
});

test('não permite que o cliente marque cartão como pago no payload de criação', async () => {
  await assert.rejects(
    () =>
      createOrderService.execute({
        userId: 42,
        restaurantId: 7,
        userRestaurantId: 7,
        type: OrderType.RETIRADA,
        paymentMethod: PaymentMethod.CARTAO,
        paid: true,
        items: [{ productId: 10, quantity: 1 }],
      }),
    /pagamento só pode ser confirmado pelo provedor/i,
  );
});
