import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import { attendantWorkspaceEvents } from '../../attendant/realtime/attendantWorkspaceEvents.js';

type CallEventPayload = {
  id: number;
  restaurantId: number;
  tableId: number;
  tableSessionId?: number | null;
  type: string;
  status: string;
  [key: string]: unknown;
};

export const tableServiceCallEvents = {
  async created(payload: CallEventPayload) {
    io.to(`restaurant:${payload.restaurantId}:waiter`).emit('waiter-call:created', payload);
    io.to(`restaurant:${payload.restaurantId}:admin`).emit('waiter-call:created', payload);
    attendantWorkspaceEvents.invalidated(payload.restaurantId, 'CALLS');
  },

  async updated(payload: CallEventPayload) {
    io.to(`restaurant:${payload.restaurantId}:waiter`).emit('waiter-call:updated', payload);
    io.to(`restaurant:${payload.restaurantId}:admin`).emit('waiter-call:updated', payload);
    if (payload.tableSessionId) {
      io.to(`table-session:${payload.tableSessionId}`).emit('waiter-call:updated', {
        id: payload.id,
        tableId: payload.tableId,
        tableSessionId: payload.tableSessionId,
        type: payload.type,
        status: payload.status,
      });
    }
    attendantWorkspaceEvents.invalidated(payload.restaurantId, 'CALLS');
  },
};
