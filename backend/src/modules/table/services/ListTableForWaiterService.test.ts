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
  assert.equal(query.include.tableSessions.where.status, 'OPEN');
  assert.ok(query.include.tableSessions.where.OR[1].expiresAt.gt instanceof Date);
  assert.deepEqual(query.include.tableSessions.orderBy, { openedAt: 'desc' });
  assert.equal(query.include.tableSessions.take, 1);
  assert.deepEqual(query.orderBy, { number: 'asc' });
});
