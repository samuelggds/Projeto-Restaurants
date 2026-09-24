// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';

import prisma from '../../../config/prisma.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import orderRepository from '../repositories/OrderRepository.js';

const originalHttpCreateServer = http.createServer;
const originalRestaurantRepositoryMethods = {
  findByRestaurantId: restaurantSettingsRepository.findByRestaurantId,
  create: restaurantSettingsRepository.create,
};
const originalOrderRepositoryMethods = {
  findById: orderRepository.findById,
  setCardCheckoutSessionId: orderRepository.setCardCheckoutSessionId,
  deleteById: orderRepository.deleteById,
};
const originalPrismaRestaurantUpdate = prisma.restaurant.update;
const originalPrismaRestaurantSettingsFindUnique = prisma.restaurantSettings.findUnique;
const originalPrismaOrderUpdateMany = prisma.order.updateMany;
const originalPrismaOrderFindFirst = prisma.order.findFirst;
const originalPrismaTableBillItemUpdateMany = prisma.tableBillItem.updateMany;
const originalPrismaPrinterSettingsFindFirst = prisma.restaurantPrinterSettings.findFirst;
const originalPrismaTransaction = prisma.$transaction;
const originalPrismaQueryRaw = prisma.$queryRaw;
const originalFetch = globalThis.fetch;

prisma.$transaction = async (callback) => callback(prisma);
prisma.$queryRaw = async () => [{ set_config: '7' }];
prisma.restaurantPrinterSettings.findFirst = async ({ where }) => {
  assert.deepEqual(where, { restaurantId: 7, enabled: true });
  return null;
};
prisma.restaurantSettings.findUnique = async () => ({
  whatsappEnabled: false,
  receiveStatusNotifications: false,
});

http.createServer = ((...args) => {
  const server = originalHttpCreateServer(...args);
  server.listen = () => server;
  return server;
}) as typeof http.createServer;

const [
  { default: CreateRestaurantSettingsController },
  { default: CreateOrderCardCheckoutController },
  { default: PagBankOrderWebhookController },
  { default: createOrderService },
] = await Promise.all([
  import('../../restaurantSettings/controllers/CreateRestaurantSettingsController.js'),
  import('../controllers/CreateOrderCardCheckoutController.js'),
  import('../controllers/PagBankOrderWebhookController.js'),
  import('../services/CreateOrderService.js'),
]);

http.createServer = originalHttpCreateServer;

afterEach(() => {
  restaurantSettingsRepository.findByRestaurantId =
    originalRestaurantRepositoryMethods.findByRestaurantId;
  restaurantSettingsRepository.create = originalRestaurantRepositoryMethods.create;
  orderRepository.findById = originalOrderRepositoryMethods.findById;
  orderRepository.setCardCheckoutSessionId =
    originalOrderRepositoryMethods.setCardCheckoutSessionId;
  orderRepository.deleteById = originalOrderRepositoryMethods.deleteById;
  prisma.restaurant.update = originalPrismaRestaurantUpdate;
  prisma.restaurantSettings.findUnique = originalPrismaRestaurantSettingsFindUnique;
  prisma.order.updateMany = originalPrismaOrderUpdateMany;
  prisma.order.findFirst = originalPrismaOrderFindFirst;
  prisma.tableBillItem.updateMany = originalPrismaTableBillItemUpdateMany;
  prisma.restaurantPrinterSettings.findFirst = originalPrismaPrinterSettingsFindFirst;
  prisma.$transaction = originalPrismaTransaction;
  prisma.$queryRaw = originalPrismaQueryRaw;
  globalThis.fetch = originalFetch;
});

function createTestApp() {
  const app = express();

  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = {
      id: 1,
      role: 'ADMIN',
      restaurantId: 7,
      email: 'dono@pizzaria.com',
    };
    next();
  });

  app.post('/settings', (req, res) => {
    CreateRestaurantSettingsController.handle(req, res);
  });

  app.post('/orders/card/checkout', (req, res) => {
    CreateOrderCardCheckoutController.handle(req, res);
  });

  app.post('/orders/webhook/pagbank', (req, res) => {
    PagBankOrderWebhookController.handle(req, res);
  });

  return app;
}

async function requestJson(serverPort: number, path: string, body: unknown) {
  const response = await originalFetch(`http://127.0.0.1:${serverPort}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const responseBody = await response.json();
  return { response, responseBody };
}

async function requestEmpty(serverPort: number, path: string, body: unknown) {
  const response = await originalFetch(`http://127.0.0.1:${serverPort}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return { response };
}

test('novas configurações PagBank são rejeitadas sem remover compatibilidade do webhook legado', async () => {
  restaurantSettingsRepository.findByRestaurantId = async () => null;
  restaurantSettingsRepository.create = async (data) => ({ id: 1, ...data });
  prisma.restaurant.update = async ({ data }) => ({ id: 7, ...data });

  const app = createTestApp();
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;

  try {
    const { response, responseBody } = await requestJson(port, '/settings', {
      deliveryFee: 5,
      minimumOrder: 25,
      cardGateway: 'PAGBANK',
      restaurantName: 'Pizzaria do Carlos',
    });

    assert.equal(response.status, 400);
    assert.match(String(responseBody.error || ''), /PagBank não está disponível/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('deve marcar o pedido como pago apos a confirmacao', async () => {
  prisma.$transaction = async (callback) => callback(prisma);
  prisma.$queryRaw = async () => [{ set_config: '7' }];
  prisma.restaurantPrinterSettings.findFirst = async ({ where }) => {
    assert.deepEqual(where, { restaurantId: 7, enabled: true });
    return null;
  };
  prisma.restaurantSettings.findUnique = async () => ({
    whatsappEnabled: false,
    receiveStatusNotifications: false,
  });
  let storedOrder = {
    id: 321,
    restaurantId: 7,
    userId: 55,
    total: 79.9,
    paymentMethod: 'CARTAO',
    paid: false,
    status: 'PENDENTE',
    cardCheckoutSessionId: null,
    user: {
      phone: '5511999991111',
      name: 'Maria Cliente',
    },
    restaurant: {
      name: 'Pizzaria do Carlos',
      whatsapp: '5511999990000',
    },
  };

  orderRepository.findById = async () => storedOrder;

  prisma.order.updateMany = async ({ where, data }) => {
    if (
      Number(where?.id || 0) === storedOrder.id &&
      Number(where?.restaurantId || 0) === storedOrder.restaurantId
    ) {
      storedOrder = {
        ...storedOrder,
        ...data,
      };
    }

    return { count: 1 };
  };
  prisma.tableBillItem.updateMany = async () => ({ count: 0 });

  const paidOrder = await orderRepository.confirmPayment(storedOrder.id, storedOrder.restaurantId);

  assert.equal(paidOrder.paid, true);
  assert.ok(paidOrder.paidAt instanceof Date);
});
