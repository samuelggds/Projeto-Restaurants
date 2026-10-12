import assert from 'node:assert/strict';
import test from 'node:test';
import { reservationCheckInDeadline, reservationCanCheckIn, overdueReservationsWhere, expireNoShowReservations } from './tableReservationTolerance.js';

const start = new Date('2026-10-12T19:00:00.000Z');
const end = new Date('2026-10-12T21:00:00.000Z');

test('tolera até o limite e bloqueia depois (inclusive com tolerância zero)', () => {
  assert.equal(reservationCheckInDeadline(start, end, 30).toISOString(), '2026-10-12T19:30:00.000Z');
  assert.equal(reservationCanCheckIn(start, end, 30, new Date('2026-10-12T19:30:00.000Z')), true);
  assert.equal(reservationCanCheckIn(start, end, 30, new Date('2026-10-12T19:30:00.001Z')), false);
  assert.equal(reservationCanCheckIn(start, end, 0, start), true);
  assert.equal(reservationCanCheckIn(start, end, 0, new Date(start.getTime()+1)), false);
  assert.equal(reservationCanCheckIn(start, end, 30, new Date(start.getTime()-30*60_000)), true);
  assert.equal(reservationCanCheckIn(start, end, 30, new Date(start.getTime()-30*60_000-1)), false);
});

test('a duração final da reserva prevalece sobre a tolerância', () => {
  const shortEnd = new Date('2026-10-12T19:10:00.000Z');
  assert.equal(reservationCheckInDeadline(start, shortEnd, 30).getTime(), shortEnd.getTime());
  assert.equal(reservationCanCheckIn(start, shortEnd, 30, new Date(shortEnd.getTime()+1)), false);
});

test('filtro de expiração é tenant-scoped e protege reservas com check-in', async () => {
  const now = new Date('2026-10-12T19:31:00.000Z');
  const where = overdueReservationsWhere(7, 30, now);
  assert.equal(where.restaurantId, 7);
  assert.equal(where.status, 'CONFIRMED');
  assert.equal(where.checkedInAt, null);
  assert.equal(where.tableSessionId, null);
  assert.deepEqual(where.OR, [
    { startsAt: { lt: new Date('2026-10-12T19:01:00.000Z') } },
    { endsAt: { lt: now } },
  ]);
  let calls = 0;
  const tx = {
    tableReservation: {
      updateMany: async ({where: filters, data}: {where: typeof where & {tableId:number};data:{status:string}}) => {
        calls++;
        assert.equal(filters.restaurantId, 7);
        assert.equal(filters.tableId, 91);
        assert.equal(filters.status, 'CONFIRMED');
        assert.equal(data.status, 'NO_SHOW');
        return { count: 1 };
      },
    },
  };
  const result = await expireNoShowReservations(tx as never, 7, 30, now, 91);
  assert.equal(result.count, 1);
  assert.equal(calls, 1);
  assert.throws(()=>overdueReservationsWhere(0,30,now));
  assert.throws(()=>overdueReservationsWhere(7,61,now));
});
