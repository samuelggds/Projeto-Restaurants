// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import tableRepository from '../repositories/TableRepository.js';
import listTableService from './ListTableService.js';

const originalFindAll = tableRepository.findAllByRestaurant;

afterEach(() => {
  tableRepository.findAllByRestaurant = originalFindAll;
});

test('retorna estado operacional, sessão, clientes e total para a aba de mesas', async () => {
  tableRepository.findAllByRestaurant = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    return [
      {
        id: 91,
        number: 12,
        token: 'a'.repeat(32),
        active: true,
        restaurantId: 7,
        tableSessions: [
          {
            id: 55,
            status: 'OPEN',
            openedAt: new Date('2026-08-24T12:00:00.000Z'),
            expiresAt: new Date('2026-08-25T00:00:00.000Z'),
          },
        ],
        orders: [
          { id: 1, userId: 8, total: 25.5 },
          { id: 2, userId: 8, total: 10 },
          { id: 3, userId: 9, total: 4.5 },
        ],
        _count: { orders: 3, tableSessions: 1 },
      },
      {
        id: 92,
        number: 13,
        token: 'b'.repeat(32),
        active: true,
        restaurantId: 7,
        tableSessions: [],
        orders: [],
        _count: { orders: 0, tableSessions: 0 },
      },
      {
        id: 93,
        number: 14,
        token: 'c'.repeat(32),
        active: true,
        restaurantId: 7,
        tableSessions: [
          {
            id: 56,
            status: 'CLOSING_REQUESTED',
            openedAt: new Date('2026-08-24T13:00:00.000Z'),
            expiresAt: new Date('2026-08-25T01:00:00.000Z'),
          },
        ],
        orders: [],
        _count: { orders: 0, tableSessions: 1 },
      },
    ];
  };

  const result = await listTableService.execute({ restaurantId: 7 });

  assert.equal(result[0].status, 'OCCUPIED');
  assert.equal(result[0].sessionId, 55);
  assert.equal(result[0].guests, 2);
  assert.equal(result[0].total, 40);
  assert.equal(result[0].operational.activeOrdersCount, 3);
  assert.equal('orders' in result[0], false);
  assert.equal('token' in result[0], false);
  assert.equal(result[1].status, 'FREE');
  assert.equal(result[1].sessionId, null);
  assert.equal('token' in result[1], false);
  assert.equal(result[2].status, 'OCCUPIED');
  assert.equal(result[2].sessionId, 56);
  assert.equal(result[2].operational.openSession.status, 'CLOSING_REQUESTED');
  assert.equal('token' in result[2], false);

  const adminResult = await listTableService.execute({
    restaurantId: 7,
    includeQrToken: true,
  });
  assert.equal(adminResult[0].token, 'a'.repeat(32));
  assert.equal(adminResult[1].token, 'b'.repeat(32));
});

test('consulta do repositório isola restaurante e ignora sessões expiradas', async () => {
  let query;
  const fakeDb = {
    table: {
      findMany: async (args) => {
        query = args;
        return [];
      },
    },
  };

  await tableRepository.findAllByRestaurant(7, fakeDb);

  assert.equal(query.where.restaurantId, 7);
  assert.deepEqual(query.include.tableSessions.where.status, {
    in: ['OPEN', 'CLOSING_REQUESTED'],
  });
  assert.ok(query.include.tableSessions.where.OR[1].expiresAt.gt instanceof Date);
  assert.deepEqual(query.include.tableSessions.orderBy, { openedAt: 'desc' });
  assert.equal(query.include.tableSessions.take, 1);
  assert.ok(
    query.include.orders.where.OR.some((condition) => condition.settlementMode === 'TABLE_ACCOUNT'),
  );
  assert.ok(query.include.orders.where.OR.some((condition) => condition.paymentMethod === null));
  assert.deepEqual(query.orderBy, { number: 'asc' });
});

test('não permite excluir mesa enquanto existir sessão operacional ativa', async () => {
  let query;
  const fakeDb = {
    table: {
      deleteMany: async (args) => {
        query = args;
        return { count: 0 };
      },
    },
  };

  const deleted = await tableRepository.deleteIfUnused(91, 7, fakeDb);

  assert.equal(deleted, 0);
  assert.deepEqual(query.where.tableSessions.none.status, {
    in: ['OPEN', 'CLOSING_REQUESTED'],
  });
});
