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
