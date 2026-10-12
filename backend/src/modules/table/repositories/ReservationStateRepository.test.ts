// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import repository from './ReservationStateRepository.js';

test('consulta reserva somente com RLS tenant-local, sem carregar PII ou outro restaurante', async () => {
  let seenQuery;
  let setTenant = false;
  const db = {
    $transaction: async (run) => run({
      $queryRaw: async (strings, id) => {
        assert.match(strings.join(''), /set_config\('app\.restaurant_id'/u);
        assert.equal(id, '7');
        setTenant = true;
        return [];
      },
      tableReservation: {
        findMany: async (args) => {
          assert.equal(setTenant, true);
          seenQuery = args;
          return [{ tableId: 91 }, { tableId: 92 }];
        },
      },
    }),
  };
  const result = await repository.findReservedTableIds(7, db);
  assert.deepEqual([...result], [91, 92]);
  assert.equal(seenQuery.where.restaurantId, 7);
  assert.equal(seenQuery.where.status, 'CONFIRMED');
  assert.ok(seenQuery.where.endsAt.gt instanceof Date);
  assert.deepEqual(seenQuery.select, { tableId: true });
  assert.deepEqual(seenQuery.distinct, ['tableId']);
});
