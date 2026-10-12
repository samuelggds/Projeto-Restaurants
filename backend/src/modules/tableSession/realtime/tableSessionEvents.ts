import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import { attendantWorkspaceEvents } from '../../attendant/realtime/attendantWorkspaceEvents.js';
import { revokeSocketRoom } from '../../../realtime/socketRevocation.js';

type TableSessionEvent = {
  sessionId: number;
  tableId: number;
  tableNumber: number | null;
  restaurantId: number;
  status: 'OPEN' | 'CLOSED';
  openedAt?: Date | string | null;
  closedAt?: Date | string | null;
  reason?: 'closed-by-staff' | 'expired';
};

type TableTransferred = {restaurantId:number;sessionId:number;sessionPublicId:string;
  fromTableId:number;fromTableNumber:number;tableId:number;tableNumber:number;
};
export const tableSessionEvents = {
  async transferred(payload:TableTransferred) {
    io.to(`restaurant:${payload.restaurantId}:waiter`).emit('table:session-transferred',payload);
    io.to(`restaurant:${payload.restaurantId}:admin`).emit('table:session-transferred',payload);
    await io.to(`table-session:${payload.sessionId}`).emit('table:session-transferred',payload);
    attendantWorkspaceEvents.invalidated(payload.restaurantId,'TABLES');
  },
  async opened(payload: TableSessionEvent) {
    io.to(`restaurant:${payload.restaurantId}:waiter`).emit('table:session-opened', payload);
    io.to(`restaurant:${payload.restaurantId}:admin`).emit('table:session-opened', payload);
    io.to(`table-waiting:${payload.tableId}`).emit('table:session-opened', payload);
    attendantWorkspaceEvents.invalidated(payload.restaurantId, 'TABLES');
  },

  async closed(payload: TableSessionEvent) {
    io.to(`restaurant:${payload.restaurantId}:waiter`).emit('table:session-closed', payload);
    io.to(`restaurant:${payload.restaurantId}:admin`).emit('table:session-closed', payload);
    await io.to(`table-session:${payload.sessionId}`).emit('table:session-closed', {
      ...payload,
      reason: payload.reason || 'closed-by-staff',
    });
    await revokeSocketRoom(`table-session:${payload.sessionId}`);
    attendantWorkspaceEvents.invalidated(payload.restaurantId, 'TABLES');
  },
};
