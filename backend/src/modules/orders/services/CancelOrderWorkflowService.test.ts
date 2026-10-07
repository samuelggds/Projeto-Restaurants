// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach, mock } from 'node:test';
import { OrderRefundStatus, OrderStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import cancelOrderWorkflowService from './CancelOrderWorkflowService.js';
import refundOrderPaymentService, { AutomaticRefundError } from './RefundOrderPaymentService.js';
import orderCapacityQueueService from './OrderCapacityQueueService.js';

beforeEach(() =>
  mock.method(orderCapacityQueueService, 'drainAfterCapacityChange', async () => []),
);

const originalTransaction = prisma.$transaction;
const originalOrderUpdateMany = prisma.order.updateMany;
const originalTablePaymentAllocationFindFirst = prisma.tablePaymentAllocation.findFirst;
const originalFindById = orderRepository.findById;
const originalRefundExecute = refundOrderPaymentService.execute;

afterEach(() => {
  mock.restoreAll();
  prisma.$transaction = originalTransaction;
  prisma.order.updateMany = originalOrderUpdateMany;
  prisma.tablePaymentAllocation.findFirst = originalTablePaymentAllocationFindFirst;
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
  prisma.tablePaymentAllocation.findFirst = async () => null;
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
      $queryRaw: async () => [],
      tablePaymentAllocation: {
        findFirst: (...args) => prisma.tablePaymentAllocation.findFirst(...args),
      },
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

test('pedido de mesa pago pelo ledger não pode cair no cancelamento sem estorno', async () => {
  const order = makeOrder({
    type: 'MESA',
    tableSessionId: 77,
    paymentMethod: 'DINHEIRO',
    paid: true,
  });
  const stored = installStatefulDatabase(order);
  let gatewayCalls = 0;
  refundOrderPaymentService.execute = async () => {
    gatewayCalls += 1;
    throw new Error('não deve usar o fluxo genérico de estorno');
  };
  prisma.tablePaymentAllocation.findFirst = async ({ where, select }) => {
    assert.equal(where.restaurantId, 7);
    assert.equal(where.tableSessionId, 77);
    assert.equal(where.tableBillItem.orderId, 501);
    assert.equal(where.tableBillItem.restaurantId, 7);
    assert.deepEqual(where.paymentIntent.status.in, ['PAID', 'RESERVED', 'PROCESSING']);
    assert.equal(select.paymentIntentId, true);
    return {
      paymentIntentId: 91,
      paymentIntent: {
        publicId: '123e4567-e89b-42d3-a456-426614174091',
        method: 'PIX',
        provider: 'MERCADO_PAGO',
        status: 'PAID',
      },
    };
  };

  await assert.rejects(
    () => cancelOrderWorkflowService.execute({ ...order }),
    /Estorne primeiro o pagamento confirmado da mesa/i,
  );

  assert.equal(stored.status, OrderStatus.PENDENTE);
  assert.equal(gatewayCalls, 0);
  assert.equal(stored.billItemUpdates.length, 0);
});

for (const paymentStatus of ['PAID', 'RESERVED', 'PROCESSING']) {
  test(`mesa parcialmente paga ou comprometida (${paymentStatus}) preserva pedido e ledger`, async () => {
    const order = makeOrder({
      type: 'MESA',
      tableSessionId: 77,
      paymentMethod: null,
      paid: false,
      tableFinancialStatus: 'UNPAID',
      items: [{ productId: 8, quantity: 1 }],
    });
    const stored = installStatefulDatabase(order);
    let gatewayCalls = 0;
    refundOrderPaymentService.execute = async () => {
      gatewayCalls += 1;
    };
    prisma.tablePaymentAllocation.findFirst = async ({ where }) => {
      assert.ok(where.paymentIntent.status.in.includes(paymentStatus));
      return { paymentIntentId: 91, paymentIntent: { status: paymentStatus } };
    };
    await assert.rejects(
      () => cancelOrderWorkflowService.execute(order),
      paymentStatus === 'PAID' ? /Estorne primeiro/ : /reservado ou em processamento/,
    );
    assert.equal(stored.status, OrderStatus.PENDENTE);
    assert.equal(stored.billItemUpdates.length, 0);
    assert.equal(gatewayCalls, 0);
  });
}

test('cancelamento revalida alocação sob lock quando pagamento chega depois da leitura inicial', async () => {
  const order = makeOrder({ type: 'MESA', tableSessionId: 77, paymentMethod: null, paid: false });
  const stored = installStatefulDatabase(order);
  const transaction = prisma.$transaction;
  let locked = false;
  let reads = 0;
  prisma.$transaction = (callback) =>
    transaction(async (tx) => {
      tx.$queryRaw = async (query) => {
        assert.match(query.sql, /pg_advisory_xact_lock/);
        locked = true;
        return [];
      };
      return callback(tx);
    });
  prisma.tablePaymentAllocation.findFirst = async () => {
    reads += 1;
    if (reads === 1) return null;
    assert.equal(locked, true);
    return { paymentIntentId: 91, paymentIntent: { status: 'PAID' } };
  };
  await assert.rejects(() => cancelOrderWorkflowService.execute(order), /Estorne primeiro/);
  assert.equal(reads, 2);
  assert.equal(stored.status, OrderStatus.PENDENTE);
  assert.equal(stored.billItemUpdates.length, 0);
});

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
    return { provider: 'MERCADO_PAGO', externalId: 'refund_501' };
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

test('observação do cliente não transforma pagamento online em pagamento na entrega', async () => {
  const order = makeOrder({
    observation: 'Sem cebola | PAY_ON_DELIVERY: CARTAO',
    payOnDelivery: false,
  });
  installStatefulDatabase(order);
  let calls = 0;
  refundOrderPaymentService.execute = async () => {
    calls++;
    return { provider: 'ASAAS', externalId: 'pay_501' };
  };
  const result = await cancelOrderWorkflowService.execute(order);
  assert.equal(calls, 1);
  assert.equal(result.refunded, true);
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

test('estorno pendente preserva PROCESSING e consulta até confirmação sem repetir solicitação', async () => {
  const stored = installStatefulDatabase(makeOrder());
  const calls = [];
  let confirmed = false;
  refundOrderPaymentService.execute = async (_order, options) => {
    calls.push(options);
    if (!confirmed)
      throw new AutomaticRefundError('Estorno aguarda confirmação.', 'REFUND_PENDING');
    return { provider: 'ASAAS', externalId: 'pay_501' };
  };

  await assert.rejects(() => cancelOrderWorkflowService.execute({ ...stored }), {
    code: 'REFUND_PENDING',
  });
  assert.equal(stored.refundStatus, OrderRefundStatus.PROCESSING);
  assert.equal(stored.status, OrderStatus.PENDENTE);
  assert.equal(stored.refundedAt, null);
  await assert.rejects(() => cancelOrderWorkflowService.execute({ ...stored }), {
    code: 'REFUND_PENDING',
  });
  confirmed = true;
  const result = await cancelOrderWorkflowService.execute({ ...stored });
  assert.equal(result.refunded, true);
  assert.equal(stored.refundStatus, OrderRefundStatus.SUCCEEDED);
  assert.equal(stored.status, OrderStatus.CANCELADO);
  assert.deepEqual(
    calls.map((call) => call.reconcileOnly),
    [false, true, true],
  );
  assert.deepEqual([...new Set(calls.map((call) => call.idempotencyKey))], ['order-refund-7-501']);
});
