import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';

export type ParticipantOrderingEvent = {
  restaurantId: number;
  tableId: number;
  tableSessionId: number;
  participantPublicId: string;
  orderingBlocked: boolean;
  reason: 'BILL_REQUESTED' | 'PAYMENT_SETTLED';
  occurredAt: Date;
};

export const tableParticipantStateEvents = {
  async orderingUpdated(payload: ParticipantOrderingEvent) {
    io.to(`table:${payload.tableId}`).emit('table-participant:ordering-updated', payload);
    io.to(`restaurant:${payload.restaurantId}:waiter`).emit(
      'table-participant:ordering-updated',
      payload,
    );
    io.to(`restaurant:${payload.restaurantId}:admin`).emit(
      'table-participant:ordering-updated',
      payload,
    );
  },
};
