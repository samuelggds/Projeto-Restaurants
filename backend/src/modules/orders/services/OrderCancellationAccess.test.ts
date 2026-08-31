// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import http from 'node:http';
import { OrderRefundStatus, OrderStatus, UserRole } from '@prisma/client';

const originalHttpCreateServer = http.createServer;
http.createServer = ((...args) => {
  const server = originalHttpCreateServer(...args);
  server.listen = () => server;
  return server;
}) as typeof http.createServer;

const [
  { default: cancelOrderService },
  { default: refundOrderByAdminService },
  { default: cancelOrderWorkflowService },
  { default: orderRepository },
  { default: prisma },
  { default: CancelOrderController },
  { default: RefundOrderByAdminController },
] = await Promise.all([
  import('./CancelOrderService.js'),
  import('./RefundOrderByAdminService.js'),
  import('./CancelOrderWorkflowService.js'),
  import('../repositories/OrderRepository.js'),
  import('../../../config/prisma.js'),
  import('../controllers/CancelOrderController.js'),
  import('../controllers/RefundOrderByAdminController.js'),
]);

http.createServer = originalHttpCreateServer;

const originalFindById = orderRepository.findById;
const originalFindByIdForCustomer = orderRepository.findByIdForCustomer;
const originalWorkflowExecute = cancelOrderWorkflowService.execute;
const originalUserFindFirst = prisma.user.findFirst;
const originalIssueFindFirst = prisma.orderIssueThread.findFirst;
const originalTransaction = prisma.$transaction;
const originalQueryRaw = prisma.$queryRaw;
const originalCancelServiceExecute = cancelOrderService.execute;
const originalAdminRefundExecute = refundOrderByAdminService.execute;
const originalConsoleError = console.error;

beforeEach(() => {
  prisma.$transaction = async (callback) => callback(prisma);
  prisma.$queryRaw = async () => [{ set_config: '17' }];
});

afterEach(() => {
  orderRepository.findById = originalFindById;
  orderRepository.findByIdForCustomer = originalFindByIdForCustomer;
  cancelOrderWorkflowService.execute = originalWorkflowExecute;
  prisma.user.findFirst = originalUserFindFirst;
  prisma.orderIssueThread.findFirst = originalIssueFindFirst;
  prisma.$transaction = originalTransaction;
  prisma.$queryRaw = originalQueryRaw;
  cancelOrderService.execute = originalCancelServiceExecute;
  refundOrderByAdminService.execute = originalAdminRefundExecute;
  console.error = originalConsoleError;
});

function makeOrder(overrides = {}) {
  return {
    id: 701,
    restaurantId: 17,
    userId: 41,
    status: OrderStatus.PENDENTE,
    paid: true,
    paymentMethod: 'PIX',
    payOnDelivery: false,
    observation: null,
    refundStatus: OrderRefundStatus.NOT_REQUESTED,
    items: [],
    user: { id: 41, name: 'Cliente', email: 'cliente@test', phone: null },
    restaurant: { id: 17, name: 'Restaurante', whatsapp: null },
    table: null,
    ...overrides,
  };
}

function mockMissingIssueThread(orderId = 701, restaurantId = 17, expectedCalls = 1) {
  let calls = 0;
  prisma.orderIssueThread.findFirst = async (args) => {
    calls += 1;
    assert.deepEqual(args, {
      where: { orderId, restaurantId },
      include: {
        messages: {
          orderBy: { sentAt: 'asc' },
        },
      },
    });
    return null;
  };
  return () => assert.equal(calls, expectedCalls);
}

test('cancelamento do cliente usa workflow compartilhado com vínculo de usuário e tenant', async () => {
  const order = makeOrder();
  let workflowCalls = 0;
  orderRepository.findByIdForCustomer = async (orderId, userId, restaurantId) => {
    assert.equal(Number(orderId), 701);
    assert.equal(userId, 41);
    assert.equal(restaurantId, 17);
    return order;
  };
  cancelOrderWorkflowService.execute = async (receivedOrder) => {
    workflowCalls += 1;
    assert.equal(receivedOrder, order);
    return {
      order: { ...order, status: OrderStatus.CANCELADO, refundStatus: OrderRefundStatus.SUCCEEDED },
      refunded: true,
    };
  };

  const result = await cancelOrderService.execute(701, 41, 17);

  assert.equal(workflowCalls, 1);
  assert.equal(result.status, OrderStatus.CANCELADO);
  assert.equal(result.refundStatus, OrderRefundStatus.SUCCEEDED);
});

test('cliente do restaurante A não consulta nem cancela pedido real do restaurante B', async () => {
  let workflowCalls = 0;
  orderRepository.findByIdForCustomer = async (orderId, userId, restaurantId) => {
    assert.equal(Number(orderId), 701);
    assert.equal(userId, 41);
    assert.equal(restaurantId, 17);
    return null;
  };
  cancelOrderWorkflowService.execute = async () => {
    workflowCalls += 1;
    throw new Error('não deveria executar');
  };

  await assert.rejects(() => cancelOrderService.execute(701, 41, 17), /Pedido não encontrado/i);
  assert.equal(workflowCalls, 0);
});

test('admin atual precisa pertencer ao mesmo restaurante antes de estornar', async () => {
  const order = makeOrder();
  let workflowCalls = 0;
  const assertIssueThreadQuery = mockMissingIssueThread();
  orderRepository.findById = async (orderId, restaurantId) => {
    assert.equal(Number(orderId), 701);
    assert.equal(restaurantId, 17);
    return order;
  };
  prisma.user.findFirst = async ({ where }) => {
    assert.deepEqual(where, {
      id: 99,
      restaurantId: 17,
      role: UserRole.ADMIN,
      active: true,
    });
    return null;
  };
  cancelOrderWorkflowService.execute = async () => {
    workflowCalls += 1;
    throw new Error('não deveria executar');
  };

  await assert.rejects(
    () =>
      refundOrderByAdminService.execute({
        orderId: 701,
        restaurantId: 17,
        adminUserId: 99,
      }),
    /admin sem permissão para este restaurante/i,
  );
  assert.equal(workflowCalls, 0);
  assertIssueThreadQuery();
});

test('ADMIN do restaurante A não estorna pedido real pertencente ao restaurante B', async () => {
  let workflowCalls = 0;
  const assertIssueThreadQuery = mockMissingIssueThread();
  orderRepository.findById = async (orderId, restaurantId) => {
    assert.equal(Number(orderId), 701);
    assert.equal(restaurantId, 17);
    return null;
  };
  prisma.user.findFirst = async ({ where }) => {
    assert.equal(where.id, 99);
    assert.equal(where.restaurantId, 17);
    return { name: 'Admin A' };
  };
  cancelOrderWorkflowService.execute = async () => {
    workflowCalls += 1;
    throw new Error('não deveria executar');
  };

  await assert.rejects(
    () =>
      refundOrderByAdminService.execute({
        orderId: 701,
        restaurantId: 17,
        adminUserId: 99,
      }),
    /Pedido não encontrado para este restaurante/i,
  );
  assert.equal(workflowCalls, 0);
  assertIssueThreadQuery();
});

test('admin autorizado usa o mesmo workflow idempotente do cancelamento do cliente', async () => {
  const order = makeOrder();
  let workflowCalls = 0;
  const assertIssueThreadQuery = mockMissingIssueThread(701, 17, 2);
  orderRepository.findById = async () => order;
  prisma.user.findFirst = async () => ({ name: 'Admin autorizado' });
  cancelOrderWorkflowService.execute = async (receivedOrder) => {
    workflowCalls += 1;
    assert.equal(receivedOrder, order);
    return {
      order: {
        ...order,
        status: OrderStatus.CANCELADO,
        refundStatus: OrderRefundStatus.SUCCEEDED,
      },
      refunded: true,
    };
  };

  const result = await refundOrderByAdminService.execute({
    orderId: 701,
    restaurantId: 17,
    adminUserId: 99,
  });

  assert.equal(workflowCalls, 1);
  assert.equal(result.refunded, true);
  assert.equal(result.order.refundStatus, OrderRefundStatus.SUCCEEDED);
  assertIssueThreadQuery();
});

test('pedido entregue é rejeitado antes de gateway, cancelamento ou estoque', async () => {
  const deliveredOrder = makeOrder({ status: OrderStatus.ENTREGUE });
  let workflowCalls = 0;
  const assertIssueThreadQuery = mockMissingIssueThread();
  orderRepository.findById = async () => deliveredOrder;
  prisma.user.findFirst = async () => ({ name: 'Admin autorizado' });
  cancelOrderWorkflowService.execute = async () => {
    workflowCalls += 1;
    throw new Error('não deveria executar');
  };

  await assert.rejects(
    () =>
      refundOrderByAdminService.execute({
        orderId: 701,
        restaurantId: 17,
        adminUserId: 99,
      }),
    /pedidos já entregues não podem ser cancelados ou estornados/i,
  );
  assert.equal(workflowCalls, 0);
  assertIssueThreadQuery();
});

test('controllers ignoram restaurantId forjado em body, query e params', async () => {
  const received = [];
  cancelOrderService.execute = async (...args) => {
    received.push({ operation: 'cancel', args });
    return { id: 701 };
  };
  refundOrderByAdminService.execute = async (args) => {
    received.push({ operation: 'refund', args });
    return { order: { id: 701 } };
  };
  const createResponse = () => ({
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  });
  const forgedRequest = {
    params: { id: '701', restaurantId: '88' },
    query: { restaurantId: '88' },
    body: { restaurantId: 88, adminUserId: 666 },
    user: { id: 99, restaurantId: 17 },
  };

  await CancelOrderController.handle(
    { ...forgedRequest, user: { id: 41, restaurantId: 17 } },
    createResponse(),
  );
  await RefundOrderByAdminController.handle(forgedRequest, createResponse());

  assert.deepEqual(received, [
    { operation: 'cancel', args: ['701', 41, 17] },
    {
      operation: 'refund',
      args: { orderId: '701', restaurantId: 17, adminUserId: 99 },
    },
  ]);
});

test('controllers não expõem erro técnico inesperado de banco', async () => {
  console.error = () => undefined;
  const technicalError = new Error('P2028 transaction failed at postgresql://secret');
  cancelOrderService.execute = async () => {
    throw technicalError;
  };
  refundOrderByAdminService.execute = async () => {
    throw technicalError;
  };

  const createResponse = () => ({
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  });
  const cancelResponse = createResponse();
  const refundResponse = createResponse();

  await CancelOrderController.handle(
    { params: { id: '701' }, user: { id: 41, restaurantId: 17 } },
    cancelResponse,
  );
  await RefundOrderByAdminController.handle(
    { params: { id: '701' }, user: { id: 99, restaurantId: 17 } },
    refundResponse,
  );

  assert.equal(cancelResponse.statusCode, 400);
  assert.equal(refundResponse.statusCode, 400);
  assert.equal(cancelResponse.payload.error.includes('P2028'), false);
  assert.equal(refundResponse.payload.error.includes('postgresql'), false);
  assert.match(cancelResponse.payload.error, /não foi possível cancelar o pedido agora/i);
  assert.match(refundResponse.payload.error, /não foi possível cancelar e estornar/i);
});
