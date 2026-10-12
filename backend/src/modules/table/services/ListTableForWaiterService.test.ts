// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import tableRepository from '../repositories/TableRepository.js';
import reservationStateRepository from '../repositories/ReservationStateRepository.js';
import listTableService from './ListTableService.js';

const originalFindAll = tableRepository.findAllByRestaurant;
const originalFindReserved = reservationStateRepository.findReservedTableIds;

afterEach(() => {
  tableRepository.findAllByRestaurant = originalFindAll;
  reservationStateRepository.findReservedTableIds = originalFindReserved;
});

test('retorna estado operacional, sessão, clientes e total para a aba de mesas', async () => {
  reservationStateRepository.findReservedTableIds = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    // Uma mesa ocupada continua ocupada, mesmo que haja reserva futura.
    return new Set([91, 92]);
  };
  tableRepository.findAllByRestaurant = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    return [
      {
        id: 91,
        number: 12,
        token: 'a'.repeat(32),
        active: true,
        restaurantId: 7,
        restaurant: { slug: 'restaurante-teste' },
        tableSessions: [
          {
            id: 55,
            publicId: 'session-public-55',
            status: 'OPEN',
            openedAt: new Date('2026-08-24T12:00:00.000Z'),
            expiresAt: new Date('2026-08-25T00:00:00.000Z'),
            _count: { participants: 2 },
          },
        ],
        orders: [
          { id: 1, tableSessionId: 55, total: 25.5 },
          { id: 2, tableSessionId: 55, total: 10 },
          { id: 3, tableSessionId: 55, total: 4.5 },
          // Mesmo com status ainda pendente, uma comanda antiga não contamina a atual.
          { id: 4, tableSessionId: 44, total: 8.6 },
          { id: 5, tableSessionId: null, total: 15 },
        ],
        _count: { orders: 5, tableSessions: 2 },
      },
      {
        id: 92,
        number: 13,
        token: 'b'.repeat(32),
        active: true,
        restaurantId: 7,
        restaurant: { slug: 'restaurante-teste' },
        tableSessions: [],
        orders: [{ id: 6, tableSessionId: 39, total: 8.6 }],
        _count: { orders: 1, tableSessions: 1 },
      },
      {
        id: 93,
        number: 14,
        token: 'c'.repeat(32),
        active: true,
        restaurantId: 7,
        restaurant: { slug: 'restaurante-teste' },
        tableSessions: [
          {
            id: 56,
            status: 'CLOSING_REQUESTED',
            openedAt: new Date('2026-08-24T13:00:00.000Z'),
            expiresAt: new Date('2026-08-25T01:00:00.000Z'),
            _count: { participants: 1 },
          },
        ],
        orders: [{ id: 7, tableSessionId: 56, total: 7.75 }],
        _count: { orders: 1, tableSessions: 1 },
      },
      {
        id: 94,
        number: 15,
        token: 'd'.repeat(32),
        active: true,
        restaurantId: 7,
        restaurant: { slug: 'restaurante-teste' },
        tableSessions: [],
        orders: [{ id: 8, tableSessionId: null, total: 8.6 }],
        _count: { orders: 1, tableSessions: 1 },
      },
    ];
  };

  const result = await listTableService.execute({ restaurantId: 7 });

  assert.equal(result[0].status, 'OCCUPIED');
  assert.equal(result[0].reservationStatusVerified, true);
  assert.equal(result[0].restaurantSlug, 'restaurante-teste');
  assert.equal(result[0].sessionId, 55);
  assert.equal(result[0].operational.openSession.publicId, 'session-public-55');
  assert.equal(result[0].guests, 2);
  assert.equal(result[0].total, 40);
  assert.equal(result[0].operational.activeOrdersCount, 3);
  assert.equal('orders' in result[0], false);
  assert.equal('token' in result[0], false);
  assert.equal(result[1].status, 'RESERVED');
  assert.equal(result[1].operational.status, 'RESERVED');
  assert.equal(result[1].reservationStatusVerified, true);
  assert.equal(result[1].sessionId, null);
  assert.equal(result[1].guests, 0);
  assert.equal(result[1].total, 0);
  assert.equal(result[1].operational.activeOrdersCount, 0);
  assert.equal('token' in result[1], false);
  assert.equal(result[2].status, 'OCCUPIED');
  assert.equal(result[2].sessionId, 56);
  assert.equal(result[2].operational.openSession.status, 'CLOSING_REQUESTED');
  assert.equal(result[2].guests, 1);
  assert.equal(result[2].total, 7.75);
  assert.equal(result[2].operational.activeOrdersCount, 1);
  assert.equal('token' in result[2], false);
  assert.equal(result[3].status, 'FREE');
  assert.equal(result[3].guests, 0);
  assert.equal(result[3].total, 0);
  assert.equal(result[3].operational.activeOrdersCount, 0);

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
  assert.equal(query.include.tableSessions.where.restaurantId, 7);
  assert.deepEqual(query.include.tableSessions.where.status, {
    in: ['OPEN', 'CLOSING_REQUESTED'],
  });
  assert.ok(query.include.tableSessions.where.OR[1].expiresAt.gt instanceof Date);
  assert.deepEqual(query.include.tableSessions.orderBy, { openedAt: 'desc' });
  assert.equal(query.include.tableSessions.take, 1);
  assert.deepEqual(query.include.tableSessions.select._count.select.participants.where, {
    restaurantId: 7,
    status: 'ACTIVE',
    revokedAt: null,
  });
  assert.equal(query.include.orders.where.tableSession.is.restaurantId, 7);
  assert.deepEqual(query.include.orders.where.tableSession.is.status, {
    in: ['OPEN', 'CLOSING_REQUESTED'],
  });
  assert.ok(query.include.orders.where.tableSession.is.OR[1].expiresAt.gt instanceof Date);
  assert.deepEqual(query.include.orders.select, {
    id: true,
    tableSessionId: true,
    total: true,
  });
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
