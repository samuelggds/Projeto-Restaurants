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

test('deve cadastrar o restaurante, abrir checkout de cartao e marcar o pedido como pago no webhook', async () => {
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
    paidAt: null,
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
  let createdSettings = null;

  restaurantSettingsRepository.findByRestaurantId = async () => null;
  restaurantSettingsRepository.create = async (data) => ({
    id: 1,
    ...data,
  });
  prisma.restaurant.update = async ({ data }) => ({
    id: 7,
    ...data,
  });

  createOrderService.execute = async () => ({
    id: storedOrder.id,
    restaurantId: storedOrder.restaurantId,
    total: storedOrder.total,
    restaurant: storedOrder.restaurant,
  });

  orderRepository.setCardCheckoutSessionId = async (_orderId, _restaurantId, sessionId) => {
    storedOrder.cardCheckoutSessionId = sessionId;
    return storedOrder;
  };

  orderRepository.deleteById = async () => {
    throw new Error('nao deveria apagar o pedido neste fluxo');
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
  prisma.order.findFirst = async () => ({ couponRedemptionId: null });
  prisma.tableBillItem.updateMany = async () => ({ count: 0 });
  prisma.$transaction = async (callback) => callback(prisma);

  globalThis.fetch = async (url) => {
    const normalizedUrl = String(url);

    if (normalizedUrl.includes('/v2/checkout')) {
      return new Response('<checkout><code>CHK-ABC-123</code></checkout>', {
        status: 200,
        headers: {
          'Content-Type': 'application/xml',
        },
      });
    }

    if (normalizedUrl.includes('/v3/transactions/notifications/NTF-123')) {
      return new Response(
        `<transaction><code>TRX-777</code><status>3</status><reference>ordercard:${storedOrder.id}:${storedOrder.restaurantId}</reference></transaction>`,
        {
          status: 200,
          headers: {
            'Content-Type': 'application/xml',
          },
        },
      );
    }

    throw new Error(`fetch inesperado: ${normalizedUrl}`);
  };

  const app = createTestApp();
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;

  try {
    const settingsPayload = {
      deliveryFee: 5,
      minimumOrder: 25,
      legalDocumentType: 'CNPJ',
      companyDocument: '11.222.333/0001-81',
      companyLegalName: 'Pizzaria do Carlos LTDA',
      companyTradeName: 'Pizzaria do Carlos',
      companyAddress: 'Rua das Flores, 100',
      companyCnae: '5611-2/01',
      ownerFullName: 'Carlos Silva',
      ownerCpf: '123.456.789-00',
      ownerBirthDate: '1988-05-10',
      ownerEmail: 'carlos@pizzaria.com',
      ownerPhone: '(11) 99999-8888',
      ownerAddress: 'Rua das Flores, 100',
      bankName: 'Banco do Brasil',
      bankCode: '001',
      bankAccountType: 'cc',
      bankBranch: '1234-5',
      bankAccount: '99876-5',
      bankHolderDocument: '11222333000181',
      cardGateway: 'PAGBANK',
      gatewayMerchantId: 'merchant-123',
      pagbankEmail: 'pagbank@pizzaria.com',
      pagbankToken: 'token-real',
      restaurantName: 'Pizzaria do Carlos',
    };

    const { response: settingsResponse, responseBody: settingsBody } = await requestJson(
      port,
      '/settings',
      settingsPayload,
    );

    assert.equal(settingsResponse.status, 201, JSON.stringify(settingsBody));
    assert.equal(settingsBody.cardGateway, 'PAGBANK');
    assert.equal(settingsBody.pagbankToken, null);
    assert.equal(settingsBody.restaurantName, 'Pizzaria do Carlos');
    createdSettings = {
      ...settingsBody,
      pagbankToken: 'token-real',
    };
    restaurantSettingsRepository.findByRestaurantId = async () => createdSettings;

    const checkoutPayload = {
      restaurantId: 7,
      type: 'DELIVERY',
      paymentMethod: 'CARTAO',
      items: [{ productId: 1, quantity: 2 }],
      customerName: 'Maria Cliente',
      customerCpf: '12345678900',
      customerPhone: '11999991111',
      successUrl: 'http://frontend.local/cart/sucesso',
      cancelUrl: 'http://frontend.local/cart/cancelado',
    };

    const { response: checkoutResponse, responseBody: checkoutBody } = await requestJson(
      port,
      '/orders/card/checkout',
      checkoutPayload,
    );

    assert.equal(checkoutResponse.status, 201);
    assert.equal(checkoutBody.provider, 'PAGBANK');
    assert.equal(checkoutBody.sessionId, 'CHK-ABC-123');
    assert.equal(storedOrder.cardCheckoutSessionId, 'pagbank_chk:CHK-ABC-123');

    const { response: webhookResponse } = await requestEmpty(port, '/orders/webhook/pagbank', {
      notificationCode: 'NTF-123',
      restaurantId: 7,
    });

    assert.equal(webhookResponse.status, 200);
    assert.equal(storedOrder.paid, true);
    assert.ok(storedOrder.paidAt instanceof Date);
    assert.equal(storedOrder.status, 'PENDENTE');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

const originalOrderUpdateMany = prisma.order.updateMany;
const originalFindById = orderRepository.findById;

afterEach(() => {
  prisma.order.updateMany = originalOrderUpdateMany;
  prisma.tableBillItem.updateMany = originalPrismaTableBillItemUpdateMany;
  orderRepository.findById = originalFindById;
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
