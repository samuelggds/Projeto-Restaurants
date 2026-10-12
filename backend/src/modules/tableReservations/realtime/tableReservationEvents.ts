import { realtimePublisher } from '../../../realtime/realtimePublisher.js';

/** Tenant-room-only cache invalidation. Never put guest PII on a socket event. */
export const tableReservationEvents = {
  changed(restaurantId: number) {
    if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) {
      throw new TypeError('Restaurante inválido para notificar reservas.');
    }
    const event = 'table:reservations-changed';
    const payload = { changed: true };
    realtimePublisher.to(`restaurant:${restaurantId}:waiter`).emit(event, payload);
    realtimePublisher.to(`restaurant:${restaurantId}:admin`).emit(event, payload);
  },
};
