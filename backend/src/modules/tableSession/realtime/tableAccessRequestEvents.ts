import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';

type AccessRequestEvent = {
  publicId: string;
  restaurantId: number;
  tableId: number;
  tableNumber: number;
  displayName: string;
  phone: string;
  status: 'WAITING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONSUMED';
  createdAt: Date | string;
};

export const tableAccessRequestEvents = {
  requested(payload: AccessRequestEvent) {
    io.to(`restaurant:${payload.restaurantId}:waiter`).emit('table-access:requested', payload);
    io.to(`restaurant:${payload.restaurantId}:admin`).emit('table-access:requested', payload);
  },

  updated(payload: AccessRequestEvent) {
    io.to(`restaurant:${payload.restaurantId}:waiter`).emit('table-access:updated', payload);
    io.to(`restaurant:${payload.restaurantId}:admin`).emit('table-access:updated', payload);
  },
};
