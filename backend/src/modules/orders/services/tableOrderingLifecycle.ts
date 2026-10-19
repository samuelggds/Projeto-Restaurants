import type { Prisma } from '@prisma/client';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import tableParticipantStateService from '../../tableSession/services/TableParticipantStateService.js';
import { tableParticipantStateEvents } from '../../tableSession/realtime/tableParticipantStateEvents.js';
import { tableAccountEvents } from '../../tableAccount/realtime/tableAccountEvents.js';

// Esta restricao pertence ao participante e nao a todos os clientes da mesa.
type TableOrder = {
  type: string;
  restaurantId: number;
  tableSessionId?: number | null;
  participantId?: number | null;
  table?: { id: number } | null;
  participant?: { publicId: string } | null;
};

export type TableOrderingReleaseReason = 'PAYMENT_SETTLED' | 'PAYMENT_CANCELED';

function hasTableParticipant(order: TableOrder) {
  return (
    order.type === 'MESA' &&
    Number.isSafeInteger(Number(order.restaurantId)) &&
    Number(order.restaurantId) > 0 &&
    Number.isSafeInteger(Number(order.tableSessionId)) &&
    Number(order.tableSessionId) > 0 &&
    Number.isSafeInteger(Number(order.participantId)) &&
    Number(order.participantId) > 0
  );
}

/**
 * Chamar somente com o contexto RLS do restaurante aplicado na transacao.
 * O UPDATE condicional devolve 1 apenas quando um bloqueio foi removido.
 */
export async function releaseTableOrderingInTransaction(
  tx: Prisma.TransactionClient,
  order: TableOrder,
  now = new Date(),
): Promise<number> {
  if (!hasTableParticipant(order)) return 0;
  return tableParticipantStateService.releaseOrderingAfterPayment(tx, {
    restaurantId: Number(order.restaurantId),
    tableSessionId: Number(order.tableSessionId),
    participantId: Number(order.participantId),
    now,
  });
}

/** Socket.IO nao e transacional: informar apenas apos COMMIT. */
export async function publishTableOrderingRelease(
  order: TableOrder,
  reason: TableOrderingReleaseReason,
  now = new Date(),
) {
  if (!hasTableParticipant(order)) return;
  if (order.table?.id && order.participant?.publicId) {
    await tableParticipantStateEvents.orderingUpdated({
      restaurantId: order.restaurantId,
      tableId: Number(order.table.id),
      tableSessionId: Number(order.tableSessionId),
      participantPublicId: String(order.participant.publicId),
      orderingBlocked: false,
      reason,
      occurredAt: now,
    });
  }
  await tableAccountEvents.updated({
    sessionId: Number(order.tableSessionId),
    restaurantId: order.restaurantId,
    reason: 'PAYMENT_STATUS_CHANGED',
  });
}

/**
 * Replays de webhooks repararam estados antigos sem repetir o efeito financeiro.
 * A consulta RLS e o UPDATE nao dependem de memoria local do worker.
 */
export async function reconcileTableOrderingAfterCommit(
  order: TableOrder,
  reason: TableOrderingReleaseReason,
): Promise<boolean> {
  if (!hasTableParticipant(order)) return false;
  const changed = await withTenantDbContext(order.restaurantId, (tx) =>
    releaseTableOrderingInTransaction(tx, order),
  );
  if (changed > 0) await publishTableOrderingRelease(order, reason);
  return changed > 0;
}
