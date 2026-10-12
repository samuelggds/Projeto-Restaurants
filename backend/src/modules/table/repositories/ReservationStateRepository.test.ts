import type prisma from '../../../config/prisma.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import repository from './ReservationStateRepository.js';

test('consulta reserva somente com RLS tenant-local, sem carregar PII ou outro restaurante', async () => {
  let seenQuery: {where:{restaurantId:number;status:string;endsAt:{gt:Date}};select:{tableId:boolean};distinct:string[]} | undefined;
  let setTenant = false;
  const db = {
    $transaction: async (run: (transaction: unknown) => Promise<unknown>) => run({
      $queryRaw: async (strings: TemplateStringsArray, id: string) => {
        assert.match(strings.join(''), /set_config\('app\.restaurant_id'/u);
        assert.equal(id, '7');
        setTenant = true;
        return [];
      },
      restaurantSettings: {
        findUnique: async ({ where, select }: {
          where: {restaurantId:number}; select:{tableReservationToleranceMinutes:boolean};
        }) => {
          assert.equal(setTenant, true);
          assert.deepEqual(where, {restaurantId:7});
          assert.deepEqual(select, {tableReservationToleranceMinutes:true});
          return { tableReservationToleranceMinutes: 30 };
        },
      },
      tableReservation: {
        findMany: async (args: NonNullable<typeof seenQuery>) => {
          assert.equal(setTenant, true);
          seenQuery = args;
          return [{ tableId: 91 }, { tableId: 92 }];
        },
      },
    }),
  };
  const result = await repository.findReservedTableIds(7, db as unknown as typeof prisma);
  assert.ok(seenQuery);
  assert.deepEqual([...result], [91, 92]);
  assert.equal(seenQuery.where.restaurantId, 7);
  assert.equal(seenQuery.where.status, 'CONFIRMED');
  assert.ok(seenQuery.where.endsAt.gt instanceof Date);
  assert.deepEqual((seenQuery.where as typeof seenQuery.where & {NOT:{restaurantId:number;status:string;checkedInAt:null;tableSessionId:null}}).NOT.restaurantId, 7);
  assert.equal((seenQuery.where as typeof seenQuery.where & {NOT:{restaurantId:number;status:string;checkedInAt:null;tableSessionId:null}}).NOT.status, 'CONFIRMED');
  assert.deepEqual(seenQuery.select, { tableId: true });
  assert.deepEqual(seenQuery.distinct, ['tableId']);
});
