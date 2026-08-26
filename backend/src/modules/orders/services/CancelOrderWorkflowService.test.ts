// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { OrderRefundStatus, OrderStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import cancelOrderWorkflowService from './CancelOrderWorkflowService.js';
import refundOrderPaymentService, { AutomaticRefundError } from './RefundOrderPaymentService.js';

const originalTransaction = prisma.$transaction;
const originalOrderUpdateMany = prisma.order.updateMany;
const originalFindById = orderRepository.findById;
const originalRefundExecute = refundOrderPaymentService.execute;

afterEach(() => {
  prisma.$transaction = originalTransaction;
  prisma.order.updateMany = originalOrderUpdateMany;
  orderRepository.findById = originalFindById;
  refundOrderPaymentService.execute = originalRefundExecute;
});

function makeOrder(overrides = {}) {
  return {
    id: 501,
    restaurantId: 7,
    userId: 31,
    status: OrderStatus.PENDENTE,
    paid: true,
    paymentMethod: 'PIX',
    payOnDelivery: false,
    observation: null,
    total: 50,
    pixPaymentId: 'asaas:pay_501',
    cardCheckoutSessionId: null,
    refundStatus: OrderRefundStatus.NOT_REQUESTED,
    refundRequestedAt: null,
    refundedAt: null,
    refundFailureReason: null,
    refundIdempotencyKey: null,
    refundProvider: null,
    refundExternalId: null,
    items: [],
    user: { id: 31, name: 'Cliente', email: 'cliente@test', phone: '11999999999' },
    restaurant: { id: 7, name: 'Restaurante', whatsapp: null },
    table: null,
    ...overrides,
  };
}

function installStatefulDatabase(initialOrder) {
  const stored = { ...initialOrder };
  const billItemUpdates = [];
  stored.billItemUpdates = billItemUpdates;

  const updateMany = async ({ where, data }) => {
    if (where.id !== stored.id || where.restaurantId !== stored.restaurantId) {
      return { count: 0 };
    }
    if (typeof where.status === 'string' && where.status !== stored.status) {
      return { count: 0 };
    }
    if (where.status?.notIn?.includes(stored.status)) {
      return { count: 0 };
    }
    if (typeof where.paid === 'boolean' && where.paid !== stored.paid) {
      return { count: 0 };
    }
    if (typeof where.refundStatus === 'string' && where.refundStatus !== stored.refundStatus) {
      return { count: 0 };
    }
    if (
      typeof where.refundIdempotencyKey === 'string' &&
      where.refundIdempotencyKey !== stored.refundIdempotencyKey
    ) {
      return { count: 0 };
    }

    Object.assign(stored, data);
    return { count: 1 };
  };

  prisma.order.updateMany = updateMany;
  orderRepository.findById = async (id, restaurantId) =>
    Number(id) === stored.id && Number(restaurantId) === stored.restaurantId ? { ...stored } : null;
  prisma.$transaction = async (callback) =>
    callback({
      order: {
        updateMany,
        findFirst: async ({ select } = {}) =>
          select?.couponRedemptionId ? { couponRedemptionId: null } : { ...stored },
      },
      product: {
        updateMany: async () => ({ count: 0 }),
      },
      couponRedemption: {
        updateMany: async () => ({ count: 0 }),
        findFirst: async () => null,
      },
      tableBillItem: {
        updateMany: async (args) => {
          billItemUpdates.push(args);
          return { count: 2 };
        },
      },
    });

  return stored;
}

test('claim atomico impede dois estornos concorrentes do mesmo pedido', async () => {
  const order = makeOrder();
  const stored = installStatefulDatabase(order);
  let gatewayCalls = 0;
  let releaseGateway;
  const gatewayGate = new Promise((resolve) => {
    releaseGateway = resolve;
  });

  refundOrderPaymentService.execute = async (_order, options) => {
    gatewayCalls += 1;
    assert.equal(options.idempotencyKey, 'order-refund-7-501');
    await gatewayGate;
    return { provider: 'ASAAS', externalId: 'pay_501' };
  };

  const firstCancellation = cancelOrderWorkflowService.execute({ ...order });
  await Promise.resolve();
  assert.equal(stored.refundStatus, OrderRefundStatus.PROCESSING);

  await assert.rejects(
    () => cancelOrderWorkflowService.execute({ ...order }),
    /estorno deste pedido já está em processamento/i,
  );
  assert.equal(gatewayCalls, 1);

  releaseGateway();
  const result = await firstCancellation;
  assert.equal(result.refunded, true);
  assert.equal(result.order.status, OrderStatus.CANCELADO);
  assert.equal(stored.refundStatus, OrderRefundStatus.SUCCEEDED);
  assert.equal(stored.refundProvider, 'ASAAS');
});

test('retry após sucesso financeiro apenas conclui cancelamento sem chamar gateway', async () => {
  const stored = installStatefulDatabase(
    makeOrder({
      refundStatus: OrderRefundStatus.SUCCEEDED,
      refundRequestedAt: new Date(),
      refundedAt: new Date(),
      refundIdempotencyKey: 'order-refund-7-501',
      refundProvider: 'MERCADO_PAGO',
      refundExternalId: 'refund-501',
    }),
  );
  let gatewayCalls = 0;
  refundOrderPaymentService.execute = async () => {
    gatewayCalls += 1;
    throw new Error('gateway não deveria ser chamado');
  };

  const result = await cancelOrderWorkflowService.execute({ ...stored });

  assert.equal(gatewayCalls, 0);
  assert.equal(result.refunded, true);
  assert.equal(stored.status, OrderStatus.CANCELADO);
});

test('falha operacional após gateway preserva SUCCEEDED e retry não duplica estorno', async () => {
  const order = makeOrder();
  const stored = installStatefulDatabase(order);
  const workingTransaction = prisma.$transaction;
  let gatewayCalls = 0;
  refundOrderPaymentService.execute = async () => {
    gatewayCalls += 1;
    return { provider: 'STRIPE', externalId: 're_501' };
  };
  prisma.$transaction = async () => {
    throw new Error('falha temporária no commit operacional');
  };

  await assert.rejects(
    () => cancelOrderWorkflowService.execute({ ...order }),
    /falha temporária no commit operacional/i,
  );
  assert.equal(gatewayCalls, 1);
  assert.equal(stored.status, OrderStatus.PENDENTE);
  assert.equal(stored.refundStatus, OrderRefundStatus.SUCCEEDED);

  prisma.$transaction = workingTransaction;
  const retried = await cancelOrderWorkflowService.execute({ ...stored });
  assert.equal(gatewayCalls, 1);
  assert.equal(retried.order.status, OrderStatus.CANCELADO);
  assert.equal(retried.refunded, true);
});

test('falha do provedor mantém pedido ativo e registra FAILED sem falso positivo', async () => {
  const order = makeOrder();
  const stored = installStatefulDatabase(order);
  refundOrderPaymentService.execute = async () => {
    throw new AutomaticRefundError(
      'O provedor não confirmou o estorno. O pedido não foi cancelado.',
      'PROVIDER_FAILURE',
    );
  };

  await assert.rejects(
    () => cancelOrderWorkflowService.execute({ ...order }),
    /provedor não confirmou o estorno/i,
  );

  assert.equal(stored.status, OrderStatus.PENDENTE);
  assert.equal(stored.refundStatus, OrderRefundStatus.FAILED);
  assert.match(stored.refundFailureReason, /pedido não foi cancelado/i);
  assert.equal(stored.refundedAt, null);
});

test('pagamento na entrega cancela sem chamar qualquer provedor', async () => {
  const order = makeOrder({
    paid: true,
    paymentMethod: 'CARTAO',
    payOnDelivery: true,
    pixPaymentId: null,
  });
  const stored = installStatefulDatabase(order);
  let gatewayCalls = 0;
  refundOrderPaymentService.execute = async () => {
    gatewayCalls += 1;
    throw new Error('gateway não deveria ser chamado');
  };

  const result = await cancelOrderWorkflowService.execute({ ...order });

  assert.equal(gatewayCalls, 0);
  assert.equal(result.refunded, false);
  assert.equal(stored.status, OrderStatus.CANCELADO);
  assert.equal(stored.refundStatus, OrderRefundStatus.NOT_REQUESTED);
});

test('cancelamento de pedido da mesa retira as unidades não pagas da conta', async () => {
  const order = makeOrder({
    paid: false,
    paymentMethod: null,
    tableSessionId: 55,
    participantId: 80,
  });
  const stored = installStatefulDatabase(order);

  const result = await cancelOrderWorkflowService.execute({ ...order });

  assert.equal(result.order.status, OrderStatus.CANCELADO);
  assert.equal(stored.billItemUpdates.length, 1);
  assert.deepEqual(stored.billItemUpdates[0].where, {
    orderId: 501,
    restaurantId: 7,
    canceledAt: null,
  });
  assert.ok(stored.billItemUpdates[0].data.canceledAt instanceof Date);
  assert.equal(stored.billItemUpdates[0].data.cancellationReason, 'Pedido cancelado');
});

test('estorno concluído marca pedido e unidades da mesa como REFUNDED', async () => {
  const refundedAt = new Date('2026-08-25T15:00:00.000Z');
  const stored = installStatefulDatabase(
    makeOrder({
      tableSessionId: 55,
      participantId: 80,
      refundStatus: OrderRefundStatus.SUCCEEDED,
      refundedAt,
    }),
  );

  const result = await cancelOrderWorkflowService.execute({ ...stored });

  assert.equal(result.refunded, true);
  assert.equal(stored.status, OrderStatus.CANCELADO);
  assert.equal(stored.tableFinancialStatus, 'REFUNDED');
  assert.equal(stored.billItemUpdates.length, 1);
  assert.equal(stored.billItemUpdates[0].data.financialStatus, 'REFUNDED');
  assert.equal(stored.billItemUpdates[0].data.refundedAt, refundedAt);
  assert.equal(stored.billItemUpdates[0].data.canceledAt, refundedAt);
});
