// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus } from '@prisma/client';
import orderRepository from './OrderRepository.js';

function makeOrder(overrides = {}) {
  return {
    id: 91,
    restaurantId: 7,
    userId: 13,
    status: OrderStatus.PENDENTE,
    paid: false,
    ...overrides,
  };
}

test('confirmPayment bloqueia confirmação tardia de pedido cancelado', async () => {
  const cancelledOrder = makeOrder({ status: OrderStatus.CANCELADO });
  const db = {
    $queryRaw: async () => [],
    order: {
      updateMany: async ({ where }) => {
        assert.equal(where.restaurantId, 7);
        assert.equal(where.paid, false);
        assert.deepEqual(where.status, { not: OrderStatus.CANCELADO });
        return { count: 0 };
      },
      findFirst: async () => cancelledOrder,
    },
  };

  await assert.rejects(
    () => orderRepository.confirmPayment(91, 7, db),
    /pedido cancelado; confirmação bloqueada/i,
  );
});

test('confirmPayment permanece idempotente quando outra confirmação venceu a corrida', async () => {
  const paidOrder = makeOrder({ paid: true, paidAt: new Date() });
  const db = {
    order: {
      updateMany: async () => ({ count: 0 }),
      findFirst: async () => paidOrder,
    },
  };

  const result = await orderRepository.confirmPayment(91, 7, db);
  assert.equal(result, paidOrder);
});

async function assertTablePaymentSynchronization({ confirm, expectedProof = undefined }) {
  const paidOrder = makeOrder({
    tableSessionId: 55,
    participantId: 80,
    paid: true,
    paidAt: new Date('2026-08-25T15:00:00.000Z'),
  });
  const orderUpdates = [];
  const billItemUpdates = [];
  const db = {
    $queryRaw: async () => [],
    order: {
      updateMany: async (args) => {
        orderUpdates.push(args);
        return { count: 1 };
      },
      findFirst: async () => paidOrder,
    },
    tableBillItem: {
      updateMany: async (args) => {
        billItemUpdates.push(args);
        return { count: 2 };
      },
    },
    restaurantPrinterSettings: {
      findFirst: async ({ where }) => {
        assert.equal(where.restaurantId, 7);
        assert.equal(where.enabled, true);
        return null;
      },
    },
  };

  const result = await confirm(db);

  assert.equal(result, paidOrder);
  assert.equal(orderUpdates.length, 2);
  assert.deepEqual(orderUpdates[0].where, {
    id: 91,
    restaurantId: 7,
    paid: false,
    status: { not: OrderStatus.CANCELADO },
  });
  assert.equal(orderUpdates[0].data.paid, true);
  assert.ok(orderUpdates[0].data.paidAt instanceof Date);
  if (expectedProof) {
    assert.equal(orderUpdates[0].data.paymentProof, expectedProof.paymentProof);
    assert.equal(orderUpdates[0].data.paymentProofImage, expectedProof.paymentProofImage);
  }
  assert.deepEqual(orderUpdates[1], {
    where: { id: 91, restaurantId: 7, tableSessionId: { not: null } },
    data: { tableFinancialStatus: 'PAID' },
  });
  assert.equal(billItemUpdates.length, 1);
  assert.deepEqual(billItemUpdates[0].where, {
    orderId: 91,
    restaurantId: 7,
    canceledAt: null,
  });
  assert.equal(billItemUpdates[0].data.financialStatus, 'PAID');
  assert.equal(billItemUpdates[0].data.paidAt, orderUpdates[0].data.paidAt);
}

test('confirmPayment sincroniza o pedido e somente as unidades ativas da conta da mesa', async () => {
  await assertTablePaymentSynchronization({
    confirm: (db) => orderRepository.confirmPayment(91, 7, db),
  });
});

test('confirmPixPayment sincroniza a conta da mesa e preserva os dados da confirmação', async () => {
  await assertTablePaymentSynchronization({
    confirm: (db) =>
      orderRepository.confirmPixPayment(
        91,
        7,
        {
          paymentProof: 'provider:approved',
          paymentProofImage: 'https://provider.test/proof.png',
        },
        db,
      ),
    expectedProof: {
      paymentProof: 'provider:approved',
      paymentProofImage: 'https://provider.test/proof.png',
    },
  });
});

test('updateStatusIfCurrent rejeita cancelamento com leitura de pagamento obsoleta', async () => {
  const paidMeanwhile = makeOrder({ paid: true });
  const db = {
    order: {
      updateMany: async ({ where }) => {
        assert.equal(where.status, OrderStatus.PENDENTE);
        assert.equal(where.paid, false);
        return { count: 0 };
      },
      findFirst: async () => paidMeanwhile,
    },
  };

  await assert.rejects(
    () =>
      orderRepository.updateStatusIfCurrent(
        91,
        OrderStatus.CANCELADO,
        7,
        { status: OrderStatus.PENDENTE, paid: false },
        db,
      ),
    /atualizado por outro processo/i,
  );
});

test('updateStatusIfCurrent grava quando status e pagamento ainda correspondem', async () => {
  const updatedOrder = makeOrder({ status: OrderStatus.CANCELADO });
  let findCalls = 0;
  const db = {
    order: {
      updateMany: async () => ({ count: 1 }),
      findFirst: async () => {
        findCalls += 1;
        return updatedOrder;
      },
    },
  };

  const result = await orderRepository.updateStatusIfCurrent(
    91,
    OrderStatus.CANCELADO,
    7,
    { status: OrderStatus.PENDENTE, paid: false },
    db,
  );

  assert.equal(result, updatedOrder);
  assert.equal(findCalls, 1);
});

test('busca para cancelamento de cliente global deriva o tenant sem abrir acesso cruzado', async () => {
  const seenWhere = [];
  const customerOrder = makeOrder();
  const db = {
    order: {
      findFirst: async ({ where }) => {
        seenWhere.push(where);
        return customerOrder;
      },
    },
  };

  await orderRepository.findByIdForCustomer(91, 13, null, db);
  await orderRepository.findByIdForCustomer(91, 13, 7, db);

  assert.deepEqual(seenWhere[0], { id: 91, userId: 13 });
  assert.deepEqual(seenWhere[1], { id: 91, userId: 13, restaurantId: 7 });
});
