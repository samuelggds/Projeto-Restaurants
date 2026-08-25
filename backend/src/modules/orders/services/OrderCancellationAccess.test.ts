// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
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
const originalIssueFindUnique = prisma.orderIssueThread.findUnique;
const originalCancelServiceExecute = cancelOrderService.execute;
const originalAdminRefundExecute = refundOrderByAdminService.execute;
const originalConsoleError = console.error;

afterEach(() => {
  orderRepository.findById = originalFindById;
  orderRepository.findByIdForCustomer = originalFindByIdForCustomer;
  cancelOrderWorkflowService.execute = originalWorkflowExecute;
  prisma.user.findFirst = originalUserFindFirst;
  prisma.orderIssueThread.findUnique = originalIssueFindUnique;
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

test('admin atual precisa pertencer ao mesmo restaurante antes de estornar', async () => {
  const order = makeOrder();
  let workflowCalls = 0;
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
  prisma.orderIssueThread.findUnique = async () => null;
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
});

test('admin autorizado usa o mesmo workflow idempotente do cancelamento do cliente', async () => {
  const order = makeOrder();
  let workflowCalls = 0;
  orderRepository.findById = async () => order;
  prisma.user.findFirst = async () => ({ name: 'Admin autorizado' });
  prisma.orderIssueThread.findUnique = async () => null;
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
});

test('pedido entregue é rejeitado antes de gateway, cancelamento ou estoque', async () => {
  const deliveredOrder = makeOrder({ status: OrderStatus.ENTREGUE });
  let workflowCalls = 0;
  orderRepository.findById = async () => deliveredOrder;
  prisma.user.findFirst = async () => ({ name: 'Admin autorizado' });
  prisma.orderIssueThread.findUnique = async () => null;
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
