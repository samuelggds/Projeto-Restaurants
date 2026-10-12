import { describe, expect, it } from 'vitest';
import type { RestaurantTable, WaiterReservation } from '../types';
import { nextReservationCaption, tableOperationalState, tableOverview } from './tableOverview';

const tables: RestaurantTable[] = [
  { id:'1', number:1, status:'OCCUPIED', guests:3, total:120 },
  { id:'2', number:2, status:'FREE', guests:0, total:0 },
  { id:'3', number:3, status:'FREE', guests:0, total:0 },
];
const now = new Date('2026-10-12T14:00:00.000Z');
const reservations: WaiterReservation[] = [
  {tableId:'2',guestCount:4,startsAt:'2026-10-12T15:00:00.000Z',endsAt:'2026-10-12T16:00:00.000Z'},
  {tableId:'999',guestCount:1,startsAt:'2026-10-12T14:01:00.000Z',endsAt:'2026-10-12T15:00:00.000Z'},
  {tableId:'3',guestCount:2,startsAt:'2026-10-12T11:00:00.000Z',endsAt:'2026-10-12T12:00:00.000Z'},
];
describe('indicadores isolados por mesas disponíveis no restaurante', () => {
  it('separa ocupadas, reservadas e livres sem misturar ids de outro tenant', () => {
    const overview=tableOverview(tables,reservations,'ready',now);
    expect(overview).toMatchObject({occupiedCount:1,guests:3,freeCount:1,reservedCount:1});
    expect(tableOperationalState(tables[1],overview.upcoming)).toBe('RESERVED');
    expect(tableOperationalState(tables[2],overview.upcoming)).toBe('FREE');
    expect(nextReservationCaption(overview.nextReservation,now)).toContain('Próxima');
  });
  it('nunca apresenta zero como se as reservas tivessem carregado', () => {
    expect(tableOverview(tables,[], 'unavailable',now)).toMatchObject({
      reservedCount:null,reservationStatus:'unavailable',
    });
  });
  it('não atribui reservas quando estão desativadas', () => {
    expect(tableOverview(tables,reservations,'disabled',now)).toMatchObject({reservedCount:0,freeCount:2});
  });
  it('conta a mesa ocupada como ocupada mesmo que possua reserva posterior', () => {
    const newReservations: WaiterReservation[] = [
      {tableId:'1',guestCount:2,startsAt:'2026-10-12T15:00:00.000Z',endsAt:'2026-10-12T16:00:00.000Z'},
    ];
    expect(tableOverview(tables,newReservations,'ready',now)).toMatchObject({occupiedCount:1,reservedCount:0});
  });
});
