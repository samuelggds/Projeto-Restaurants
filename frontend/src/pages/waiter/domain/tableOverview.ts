import type { RestaurantTable, WaiterReservation, WaiterReservationAvailability } from '../types';

export type TableOperationalState = 'OCCUPIED' | 'RESERVED' | 'FREE';
export type TableFilter = TableOperationalState | 'ALL' | 'CLOSING';

export function upcomingTableReservations(
  tables: RestaurantTable[],
  reservations: WaiterReservation[] | undefined,
  now = new Date(),
) {
  const tenantTableIds = new Set(tables.map((table) => table.id));
  const instant = now.getTime();
  return (reservations ?? [])
    .filter((reservation) =>
      tenantTableIds.has(reservation.tableId) &&
      reservation.guestCount > 0 &&
      Number.isFinite(Date.parse(reservation.startsAt)) &&
      Number.isFinite(Date.parse(reservation.endsAt)) &&
      Date.parse(reservation.endsAt) > instant &&
      Date.parse(reservation.startsAt) < Date.parse(reservation.endsAt),
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export function tableOperationalState(
  table: RestaurantTable,
  upcoming: WaiterReservation[],
): TableOperationalState {
  if (table.status === 'OCCUPIED') return 'OCCUPIED';
  return table.status === 'RESERVED' || upcoming.some((reservation) => reservation.tableId === table.id) ? 'RESERVED' : 'FREE';
}

export function tableOverview(
  tables: RestaurantTable[],
  reservations: WaiterReservation[] | undefined,
  availability: WaiterReservationAvailability | undefined,
  now = new Date(),
) {
  const upcoming = upcomingTableReservations(tables, availability === 'ready' ? reservations : [], now);
  const occupied = tables.filter((table) => table.status === 'OCCUPIED');
  const reservedTables = tables.filter((table) => tableOperationalState(table, upcoming) === 'RESERVED');
  const free = tables.filter((table) => tableOperationalState(table, upcoming) === 'FREE');
  const verified = tables.every((table) => table.reservationStatusVerified === true);
  const hasAvailability = availability !== 'unavailable' && Boolean(availability) || verified;
  const nextReservation = upcoming.find((reservation) =>
    tables.some((table) => table.id === reservation.tableId && table.status !== 'OCCUPIED'),
  );
  return {
    occupiedCount: occupied.length,
    guests: occupied.reduce((sum, table) => sum + Math.max(0, table.guests), 0),
    freeCount: free.length,
    reservedCount: hasAvailability ? reservedTables.length : null,
    reservationStatus: hasAvailability ? 'ready' : 'unavailable',
    nextReservation,
    upcoming,
  };
}

export function nextReservationCaption(reservation: WaiterReservation | undefined, now = new Date()) {
  if (!reservation) return 'Nenhuma reserva pendente';
  const date = new Date(reservation.startsAt);
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
  });
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const time = formatter.format(date);
  if (day.format(date) === day.format(now)) return `Próxima às ${time}`;
  const dateText = new Intl.DateTimeFormat('pt-BR', {timeZone:'America/Sao_Paulo', day:'2-digit',month:'2-digit'}).format(date);
  return `Próxima ${dateText} às ${time}`;
}
