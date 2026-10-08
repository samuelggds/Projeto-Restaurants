// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';
import { OrderStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import kitchenPrintingService from '../../kitchenPrinting/services/KitchenPrintingService.js';
import orderRepository from '../repositories/OrderRepository.js';
import service from './OrderCapacityQueueService.js';
import {
  shouldQueueOperationalOrder,
  queueDigitalOrderBeforePaymentConfirmation,
  waitingCapacityWhere,
} from '../utils/orderCapacity.js';

const originalTransaction = prisma.$transaction;
afterEach(() => {
  prisma.$transaction = originalTransaction;
  mock.restoreAll();
});

function order(id, overrides = {}) {
  return {
    id,
    restaurantId: 7,
    userId: 100 + id,
    status: 'PENDENTE',
    paid: true,
    paymentMethod: 'PIX',
    payOnDelivery: false,
    settlementMode: null,
    refundStatus: 'NOT_REQUESTED',
    capacityQueuedAt: new Date(`2026-09-26T10:${String(id).padStart(2, '0')}:00Z`),
    capacityAdmittedAt: null,
    createdAt: new Date('2026-09-26T10:00:00Z'),
    type: 'DELIVERY',
    ...overrides,
  };
}

function matches(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'AND') return value.every((condition) => matches(row, condition));
    if (key === 'OR') return value.some((condition) => matches(row, condition));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('not' in value) return row[key] !== value.not;
      if ('in' in value) return value.in.includes(row[key]);
      if ('notIn' in value) return !value.notIn.includes(row[key]);
      throw new Error(`Unhandled predicate: ${key}`);
    }
    return row[key] === value;
  });
}

function database(rows, { limit = 2, autoAcceptOrders = false } = {}) {
  const settings = { maxConcurrentOrders: limit, autoAcceptOrders };
  const events = [];
  const queries = [];
  const printJobs = [];
  const locks = new Map();
  let transactionCount = 0;
  let beforeUpdate = () => {};

  function transactionClient() {
    let release;
    let tenantId;
    let locked = false;
    const tx = {
      $queryRaw: async (strings, ...values) => {
        if (strings.join('').includes('set_config')) {
          tenantId = Number(values[0]);
          return [];
        }
        assert.match(strings.join(''), /pg_advisory_xact_lock/);
        const restaurantId = Number(values[0]);
        const previous = locks.get(restaurantId) || Promise.resolve();
        const gate = new Promise((resolve) => {
          release = resolve;
        });
        locks.set(
          restaurantId,
          previous.then(() => gate),
        );
        await previous;
        locked = true;
        return [{ lockAcquired: 1 }];
      },
      restaurantSettings: {
        findUnique: async ({ where }) => {
          assert.ok(locked);
          assert.equal(where.restaurantId, tenantId);
          return settings;
        },
      },
      order: {
        count: async ({ where }) => {
          assert.ok(locked);
          assert.ok(where.restaurantId);
          queries.push({ operation: 'count', where });
          return rows.filter((row) => matches(row, where)).length;
        },
        findFirst: async ({ where }) => rows.find((row) => matches(row, where)) || null,
        findMany: async ({ where, take, orderBy }) => {
          assert.ok(locked);
          assert.equal(where.restaurantId, tenantId);
          assert.deepEqual(orderBy, [
            { capacityQueuedAt: 'asc' },
            { createdAt: 'asc' },
            { id: 'asc' },
          ]);
          assert.deepEqual(where, { restaurantId: tenantId, ...waitingCapacityWhere });
          queries.push({ operation: 'findMany', where });
          return rows
            .filter((row) => matches(row, where))
            .sort(
              (a, b) =>
                a.capacityQueuedAt - b.capacityQueuedAt || a.createdAt - b.createdAt || a.id - b.id,
            )
            .slice(0, take)
            .map((row) => ({ id: row.id, paid: row.paid }));
        },
        updateMany: async ({ where, data }) => {
          assert.ok(locked);
          assert.ok(where.restaurantId);
          queries.push({ operation: 'updateMany', where });
          beforeUpdate(where);
          const selected = rows.filter((row) => matches(row, where));
          selected.forEach((row) => Object.assign(row, data));
          return { count: selected.length };
        },
      },
      release: () => release?.(),
    };
    return tx;
  }

  prisma.$transaction = async (callback) => {
    transactionCount++;
    const tx = transactionClient();
    try {
      return await callback(tx);
    } finally {
      tx.release();
    }
  };
  mock.method(orderRepository, 'findById', async (id, restaurantId) => {
    const row = rows.find((row) => row.id === id && row.restaurantId === restaurantId);
    return row ? { ...row } : null;
  });
  mock.method(kitchenPrintingService, 'enqueueAutomatic', async ({ db, ...input }) => {
    assert.ok(db);
    printJobs.push(input);
  });
  mock.method(io, 'to', (room) => ({
    emit: (event, payload) => events.push({ room, event, payload }),
  }));
  return {
    settings,
    events,
    queries,
    printJobs,
    transactionClient,
    transactionCount: () => transactionCount,
    beforeUpdate: (callback) => {
      beforeUpdate = callback;
    },
  };
}

test('vaga liberada admite somente o primeiro pedido elegível do mesmo tenant', async () => {
  const rows = [
    order(1, { capacityQueuedAt: null, status: 'ENTREGUE' }),
    order(2, { capacityQueuedAt: null, status: 'PREPARANDO' }),
    order(3, { restaurantId: 8 }),
    order(4, { paid: false }),
    order(5, { refundStatus: 'PROCESSING' }),
    order(6),
    order(7),
  ];
  const db = database(rows);
  assert.deepEqual(
    (await service.drainRestaurant(7)).map((row) => row.id),
    [6],
  );
  assert.equal(rows.find((row) => row.id === 7).capacityAdmittedAt, null);
  assert.equal(rows.find((row) => row.id === 3).capacityAdmittedAt, null);
  assert.equal(db.printJobs.length, 2);
  assert.ok(db.events.every(({ room }) => !room.includes('restaurant:8')));
  assert.deepEqual(db.queries.find(({ operation }) => operation === 'updateMany').where, {
    id: 6,
    restaurantId: 7,
    ...waitingCapacityWhere,
  });
});

test('aumentar limite libera vagas em FIFO estável; diminuir não remove pedidos admitidos', async () => {
  const sameTime = new Date('2026-09-26T10:00:00Z');
  const rows = [
    order(1, { capacityQueuedAt: null }),
    order(4, { capacityQueuedAt: sameTime }),
    order(3, { capacityQueuedAt: sameTime }),
    order(5),
  ];
  const db = database(rows, { limit: 1 });
  assert.deepEqual(await service.drainRestaurant(7), []);
  db.settings.maxConcurrentOrders = 3;
  assert.deepEqual(
    (await service.drainRestaurant(7)).map((row) => row.id),
    [3, 4],
  );
  db.settings.maxConcurrentOrders = 1;
  assert.deepEqual(await service.drainRestaurant(7), []);
  assert.ok(rows.find((row) => row.id === 3).capacityAdmittedAt);
});

test('drains concorrentes respeitam lock por tenant, limite e impressão única', async () => {
  const rows = [order(1, { capacityQueuedAt: null }), order(2), order(3), order(4)];
  const db = database(rows, { limit: 3, autoAcceptOrders: true });
  const results = await Promise.all([service.drainRestaurant(7), service.drainRestaurant(7)]);
  assert.deepEqual(
    results.flat().map((row) => row.id),
    [2, 3],
  );
  assert.equal(rows[3].capacityAdmittedAt, null);
  assert.equal(rows[1].status, 'PREPARANDO');
  assert.ok(rows[1].preparationStartedAt instanceof Date);
  assert.equal(db.printJobs.filter((job) => job.event === 'OPERATIONAL_NEW_ORDER').length, 2);
});

test('CAS revalida estorno concorrente antes de admitir ou imprimir', async () => {
  const rows = [order(1)];
  const db = database(rows);
  db.beforeUpdate(() => {
    rows[0].refundStatus = 'PROCESSING';
  });
  assert.deepEqual(await service.drainRestaurant(7), []);
  assert.equal(rows[0].capacityAdmittedAt, null);
  assert.equal(db.printJobs.length, 0);
  assert.equal(db.events.length, 0);
});

test('admissão de mesa atualiza restaurante, garçom e sessão sem vazar para outro tenant', async () => {
  const rows = [order(1, { type: 'MESA', table: { id: 70, number: 2 }, tableSessionId: 12 })];
  const db = database(rows);
  await service.drainRestaurant(7);
  assert.ok(
    db.events.some(({ room, event }) => room === 'restaurant:7:waiter' && event === 'new-order'),
  );
  assert.ok(
    db.events.some(
      ({ room, event }) => room === 'table-session:12' && event === 'order:status-changed',
    ),
  );
});

test('identificador de tenant inválido não acessa banco', async () => {
  const db = database([]);
  for (const id of [0, -1, 1.5, NaN]) assert.deepEqual(await service.drainRestaurant(id), []);
  assert.equal(db.transactionCount(), 0);
});

test('falha transitória pós-commit preserva operação e pode ser reexecutada pelo worker', async () => {
  let calls = 0;
  mock.method(service, 'drainRestaurant', async (restaurantId) => {
    assert.equal(restaurantId, 7);
    if (++calls === 1) throw new Error('print queue temporarily unavailable');
    return [order(1)];
  });
  const log = mock.method(console, 'error', () => {});
  assert.deepEqual(await service.drainAfterCapacityChange(7), []);
  assert.equal(log.mock.callCount(), 1);
  assert.equal((await service.drainAfterCapacityChange(7)).length, 1);
});

test('pedido novo não fura fila quando existe vaga antes de drenar os mais antigos', async () => {
  const db = database([order(1)], { limit: 3 });
  const tx = db.transactionClient();
  try {
    assert.equal(await shouldQueueOperationalOrder(tx, 7, 3), true);
  } finally {
    tx.release();
  }
});

test('pedido novo não é bloqueado por fila de outro tenant ou pagamento ainda pendente', async () => {
  const db = database([order(1, { restaurantId: 8 }), order(2, { paid: false })]);
  const tx = db.transactionClient();
  try {
    assert.equal(await shouldQueueOperationalOrder(tx, 7, 2), false);
  } finally {
    tx.release();
  }
});

test('pagamento confirmado mantém posição original e respeita pedidos já elegíveis', async () => {
  const rows = [order(1), order(2, { paid: false, capacityQueuedAt: null })];
  const db = database(rows, { limit: 3 });
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.restaurant_id', ${'7'}, true)`;
    assert.equal(await queueDigitalOrderBeforePaymentConfirmation(tx, 2, 7), true);
  });
  assert.ok(rows[1].capacityQueuedAt);
  assert.equal(rows[1].status, OrderStatus.PENDENTE);
});
