import type { TablePaymentIntentStatus } from '@prisma/client';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';

type TableAccountUpdateReason =
  | 'PAYMENT_CREATED'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_STATUS_CHANGED'
  | 'PAYMENT_CANCELED'
  | 'PAYMENT_CONFIRMED_MANUALLY'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_EXPIRED';

export type TableAccountUpdatedEvent = {
  sessionId: number;
  restaurantId: number;
  reason: TableAccountUpdateReason;
  paymentPublicId?: string;
  paymentStatus?: TablePaymentIntentStatus;
  occurredAt?: Date | string;
};

/**
 * Informa clientes, garcons e administradores de que o extrato da mesa mudou.
 * O evento carrega somente identificadores e status; os valores continuam sendo
 * recalculados e consultados no backend para evitar confiar no socket.
 */
export const tableAccountEvents = {
  async updated(payload: TableAccountUpdatedEvent) {
    try {
      const event = {
        ...payload,
        occurredAt: payload.occurredAt || new Date().toISOString(),
      };

      io.to(`table-session:${payload.sessionId}`).emit('table-account:updated', event);
      io.to(`restaurant:${payload.restaurantId}:waiter`).emit('table-account:updated', event);
      io.to(`restaurant:${payload.restaurantId}:admin`).emit('table-account:updated', event);
      return true;
    } catch (error) {
      // O pagamento já foi persistido antes da publicação. Uma indisponibilidade
      // transitória do socket não pode transformar uma operação concluída em 502;
      // o polling do cliente continua sendo a redundância de leitura.
      console.warn('[TABLE_ACCOUNT_REALTIME_PUBLISH_FAILED]', {
        sessionId: payload.sessionId,
        restaurantId: payload.restaurantId,
        reason: payload.reason,
        error: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      });
      return false;
    }
  },
};
