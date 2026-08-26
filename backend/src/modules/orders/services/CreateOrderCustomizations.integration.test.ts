// @ts-nocheck
import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { OrderType, PaymentMethod, Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import productRepository from '../../products/repositories/ProductRepository.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import tableSessionRepository from '../../tableSession/repositories/TableSessionRepository.js';
import tableAccountSettingsRepository from '../../tableAccount/repositories/TableAccountSettingsRepository.js';
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
  findTableSessionById: tableSessionRepository.findById,
  findTableAccountSettings: tableAccountSettingsRepository.findByRestaurantId,
};

const enabledTableAccountSettings = {
  enabled: true,
  requirePrepaymentAboveCents: null,
  prepaymentWindows: [],
  allowCash: false,
  allowCardMachine: false,
  allowOnlinePayment: true,
  allowSplit: true,
  serviceFeeMode: 'DISABLED',
  serviceFeeBasisPoints: 0,
  preventCloseWithOutstandingBalance: true,
  requireEmployeeApprovalForPreparedItemCancellation: true,
  blockNewOrdersOnClosingRequest: true,
  reservationTimeoutMinutes: 10,
  timeZone: 'America/Sao_Paulo',
};

beforeEach(() => {
  tableAccountSettingsRepository.findByRestaurantId = async () => enabledTableAccountSettings;
});

afterEach(() => {
  prisma.$transaction = originals.transaction;
  orderRepository.countActiveOperationalOrders = originals.countActiveOperationalOrders;
  orderRepository.create = originals.createOrder;
  orderRepository.findById = originals.findOrderById;
  productRepository.findById = originals.findProductById;
  restaurantSettingsRepository.findByRestaurantId = originals.findSettings;
  tableSessionRepository.findById = originals.findTableSessionById;
  tableAccountSettingsRepository.findByRestaurantId = originals.findTableAccountSettings;
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

test('persiste opções agrupadas e observação do item ao criar o pedido', async () => {
  const persistedItems = [];
  const tx = {
    $queryRaw: async () => [],
    restaurantSettings: {
      findUnique: async () => ({ deliveryFee: 0, minimumOrder: 0 }),
    },
    orderItem: {
      create: async ({ data }) => {
        persistedItems.push(data);
        return {
          id: 501,
          orderId: data.orderId,
          productId: data.productId,
          quantity: data.quantity,
          price: data.price,
        };
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

test('pedido de mesa convidado vincula participante e cria uma unidade financeira por quantidade', async () => {
  const persistedOrderItems = [];
  let persistedOrder;
  let persistedBillItems;
  const session = {
    id: 55,
    publicId: '123e4567-e89b-42d3-a456-426614174001',
    tableId: 91,
    restaurantId: 7,
    status: 'OPEN',
    expiresAt: new Date(Date.now() + 60_000),
    table: { id: 91, number: 1, active: true, restaurantId: 7 },
  };
  const tx = {
    $queryRaw: async () => [],
    restaurantSettings: {
      findUnique: async () => ({
        deliveryFee: 0,
        minimumOrder: 0,
        tableOrderingEnabled: true,
      }),
    },
    tableParticipant: {
      findFirst: async ({ where }) => {
        assert.equal(where.id, 80);
        assert.equal(where.tableSessionId, 55);
        assert.equal(where.restaurantId, 7);
        assert.equal(where.status, 'ACTIVE');
        assert.equal(where.revokedAt, null);
        assert.deepEqual(where.OR[0], { userId: { not: null } });
        assert.ok(where.OR[1].tokenExpiresAt.gt instanceof Date);
        return {
          id: 80,
          userId: null,
          publicId: '123e4567-e89b-42d3-a456-426614174002',
          displayName: 'Convidado',
        };
      },
    },
    orderItem: {
      create: async ({ data }) => {
        persistedOrderItems.push(data);
        return {
          id: 501,
          orderId: data.orderId,
          productId: data.productId,
          quantity: data.quantity,
          price: data.price,
        };
      },
    },
    tableBillItem: {
      findMany: async () => [],
      createMany: async ({ data }) => {
        persistedBillItems = data;
        return { count: data.length };
      },
    },
  };

  tableSessionRepository.findById = async (id, database) => {
    assert.equal(Number(id), 55);
    if (database) assert.equal(database, tx);
    return session;
  };
  prisma.$transaction = async (callback, options) => {
    assert.equal(options?.isolationLevel, Prisma.TransactionIsolationLevel.Serializable);
    return callback(tx);
  };
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    isOpenForOrders: true,
    autoAcceptOrders: false,
    maxConcurrentOrders: 20,
  });
  orderRepository.countActiveOperationalOrders = async () => 0;
  productRepository.findById = async () => ({
    id: 10,
    restaurantId: 7,
    name: 'Produto da mesa',
    saleMode: 'BUILDABLE',
    price: 10.01,
    active: true,
    stock: null,
    ingredients: [],
    optionGroups: [
      {
        id: 100,
        restaurantId: 7,
        name: 'Escolha principal',
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
              name: 'Opção padrão',
              price: 0,
              active: true,
            },
          },
        ],
      },
    ],
  });
  orderRepository.create = async (data, database) => {
    assert.equal(database, tx);
    persistedOrder = data;
    return { id: 400, ...data };
  };
  orderRepository.findById = async () => ({
    id: 400,
    restaurantId: 7,
    userId: null,
    tableSessionId: 55,
    participantId: 80,
    status: 'PENDENTE',
    participant: { displayName: 'Convidado' },
    items: persistedOrderItems,
  });

  const result = await createOrderService.execute({
    restaurantId: 7,
    userRestaurantId: 7,
    tableSessionId: 55,
    tableSessionTableId: 91,
    participantId: 80,
    settlementMode: 'TABLE_ACCOUNT',
    type: OrderType.MESA,
    tableId: 91,
    items: [
      {
        productId: 10,
        quantity: 2,
        price: 0.01,
        optionIds: [1001],
        selectedOptions: [{ groupId: 100, optionIds: [1001] }],
      },
    ],
  });

  assert.equal(result.id, 400);
  assert.equal(persistedOrder.userId, null);
  assert.equal(persistedOrder.paymentMethod, null);
  assert.equal(persistedOrder.tableSessionId, 55);
  assert.equal(persistedOrder.participantId, 80);
  assert.equal(persistedOrder.settlementMode, 'TABLE_ACCOUNT');
  assert.equal(persistedOrder.tableFinancialStatus, 'UNPAID');
  assert.equal(Number(persistedOrder.total), 20.02);
  assert.equal(persistedOrderItems[0].restaurantId, 7);
  assert.equal(persistedOrderItems[0].tableSessionId, 55);
  assert.equal(persistedOrderItems[0].participantId, 80);
  assert.deepEqual(
    persistedBillItems.map((item) => Number(item.unitPriceCents)),
    [1001, 1001],
  );
  assert.deepEqual(
    persistedBillItems.map((item) => ({
      restaurantId: item.restaurantId,
      tableSessionId: item.tableSessionId,
      participantId: item.participantId,
      orderId: item.orderId,
      orderItemId: item.orderItemId,
      unitIndex: item.unitIndex,
      productName: item.productName,
    })),
    [
      {
        restaurantId: 7,
        tableSessionId: 55,
        participantId: 80,
        orderId: 400,
        orderItemId: 501,
        unitIndex: 1,
        productName: 'Produto da mesa',
      },
      {
        restaurantId: 7,
        tableSessionId: 55,
        participantId: 80,
        orderId: 400,
        orderItemId: 501,
        unitIndex: 2,
        productName: 'Produto da mesa',
      },
    ],
  );
  assert.ok(persistedBillItems.every((item) => item.financialStatus === 'UNPAID'));
});

test('interrompe sem gravar quando a mesa fecha entre a validação inicial e a transação', async () => {
  const openSession = {
    id: 55,
    publicId: '123e4567-e89b-42d3-a456-426614174001',
    tableId: 91,
    restaurantId: 7,
    status: 'OPEN',
    expiresAt: new Date(Date.now() + 60_000),
    table: { id: 91, number: 1, active: true, restaurantId: 7 },
  };
  const closedSession = { ...openSession, status: 'CLOSED' };
  let sessionReads = 0;
  let orderCreated = false;

  tableSessionRepository.findById = async (_id, database) => {
    sessionReads += 1;
    return database ? closedSession : openSession;
  };
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    isOpenForOrders: true,
    autoAcceptOrders: false,
    maxConcurrentOrders: 20,
  });
  prisma.$transaction = async (callback, options) => {
    assert.equal(options?.isolationLevel, Prisma.TransactionIsolationLevel.Serializable);
    return callback({ $queryRaw: async () => [] });
  };
  orderRepository.create = async () => {
    orderCreated = true;
    throw new Error('O pedido não deveria ser gravado.');
  };

  await assert.rejects(
    () =>
      createOrderService.execute({
        restaurantId: 7,
        userRestaurantId: 7,
        tableSessionId: 55,
        tableSessionTableId: 91,
        participantId: 80,
        settlementMode: 'TABLE_ACCOUNT',
        type: OrderType.MESA,
        tableId: 91,
        items: [{ productId: 10, quantity: 1 }],
      }),
    /mesa foi fechada durante o pedido/i,
  );

  assert.equal(sessionReads, 2);
  assert.equal(orderCreated, false);
});

test('pagamento imediato mantém cartão no pedido e reserva as unidades como PROCESSING', async () => {
  const persistedOrderItems = [];
  let persistedOrder;
  let persistedBillItems;
  const session = {
    id: 55,
    publicId: '123e4567-e89b-42d3-a456-426614174001',
    tableId: 91,
    restaurantId: 7,
    status: 'OPEN',
    expiresAt: new Date(Date.now() + 60_000),
    table: { id: 91, number: 1, active: true, restaurantId: 7 },
  };
  const tx = {
    $queryRaw: async () => [],
    restaurantSettings: {
      findUnique: async () => ({ deliveryFee: 0, minimumOrder: 0, tableOrderingEnabled: true }),
    },
    tableParticipant: {
      findFirst: async () => ({
        id: 80,
        userId: null,
        publicId: '123e4567-e89b-42d3-a456-426614174002',
        displayName: 'Convidado',
      }),
    },
    orderItem: {
      create: async ({ data }) => {
        persistedOrderItems.push(data);
        return {
          id: 601,
          orderId: data.orderId,
          productId: data.productId,
          quantity: data.quantity,
          price: data.price,
        };
      },
    },
    tableBillItem: {
      createMany: async ({ data }) => {
        persistedBillItems = data;
        return { count: data.length };
      },
    },
  };

  tableSessionRepository.findById = async () => session;
  prisma.$transaction = async (callback, options) => {
    assert.equal(options?.isolationLevel, Prisma.TransactionIsolationLevel.Serializable);
    return callback(tx);
  };
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    isOpenForOrders: true,
    acceptsCard: true,
    autoAcceptOrders: false,
    maxConcurrentOrders: 20,
  });
  orderRepository.countActiveOperationalOrders = async () => 0;
  productRepository.findById = async () => ({
    id: 10,
    restaurantId: 7,
    name: 'Produto pagamento imediato',
    saleMode: 'BUILDABLE',
    price: 12.34,
    active: true,
    stock: null,
    ingredients: [],
    optionGroups: [
      {
        id: 100,
        restaurantId: 7,
        name: 'Escolha principal',
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
              name: 'Opção padrão',
              price: 0,
              active: true,
            },
          },
        ],
      },
    ],
  });
  orderRepository.create = async (data, database) => {
    assert.equal(database, tx);
    persistedOrder = data;
    return { id: 401, ...data };
  };
  orderRepository.findById = async () => ({
    id: 401,
    restaurantId: 7,
    userId: null,
    tableSessionId: 55,
    participantId: 80,
    status: 'PENDENTE',
    paid: false,
    paymentMethod: PaymentMethod.CARTAO,
    participant: { displayName: 'Convidado' },
    items: persistedOrderItems,
  });

  const result = await createOrderService.execute({
    restaurantId: 7,
    userRestaurantId: 7,
    tableSessionId: 55,
    tableSessionTableId: 91,
    participantId: 80,
    settlementMode: 'PAY_NOW',
    type: OrderType.MESA,
    paymentMethod: PaymentMethod.CARTAO,
    tableId: 91,
    items: [
      {
        productId: 10,
        quantity: 1,
        optionIds: [1001],
        selectedOptions: [{ groupId: 100, optionIds: [1001] }],
      },
    ],
  });

  assert.equal(result.id, 401);
  assert.equal(persistedOrder.paymentMethod, PaymentMethod.CARTAO);
  assert.equal(persistedOrder.settlementMode, 'PAY_NOW');
  assert.equal(persistedOrder.tableFinancialStatus, 'PROCESSING');
  assert.equal(persistedOrder.paid, false);
  assert.equal(persistedBillItems.length, 1);
  assert.equal(persistedBillItems[0].financialStatus, 'PROCESSING');
  assert.equal(persistedBillItems[0].restaurantId, 7);
  assert.equal(persistedBillItems[0].tableSessionId, 55);
  assert.equal(persistedBillItems[0].participantId, 80);
});
