import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { realtimePublisher } from '../../../realtime/realtimePublisher.js';
import { LalamoveQuoteError } from './LalamoveQuotationService.js';

type Input = { restaurantId: number; actorId: number; orderId: number };
function assertInput(input: Input) {
  if (![input.restaurantId, input.actorId, input.orderId].every(
    n => Number.isSafeInteger(n) && n > 0 && n <= 2147483647,
  )) throw new LalamoveQuoteError('Solicitação inválida.', 400);
}
function dto(row: { id: string; status: string; environment: string; providerStatus?: string | null } | null) {
  return row ? { id: row.id, status: row.status, providerStatus: row.providerStatus ?? null,
    environment: 'sandbox' as const, canDispatch: false,
    reconciliationRequired: row.status === 'UNKNOWN' || row.status === 'DISPATCHING' } : null;
}
export class LalamoveDispatchManagementService {
  private async authorized(tx: Prisma.TransactionClient, input: Input) {
    const actor = await tx.user.findFirst({
      where: { id: input.actorId, restaurantId: input.restaurantId, role: 'ADMIN', active: true },
      select: { id: true, name: true, role: true },
    });
    if (!actor) throw new LalamoveQuoteError('Acesso exclusivo do administrador.', 403);
    return actor;
  }

  async current(input: Input) {
    assertInput(input);
    return prisma.$transaction(async tx => {
      await setTenantDbContext(tx, input.restaurantId);
      await this.authorized(tx, input);
      const row = await tx.restaurantExternalDeliveryDispatch.findUnique({
        where: { restaurantId_orderId: { restaurantId: input.restaurantId, orderId: input.orderId } },
        select: { id: true, status: true, environment: true, providerStatus: true },
      });
      return dto(row);
    });
  }

  async cancel(input: Input) {
    assertInput(input);
    const result = await prisma.$transaction(async tx => {
      await setTenantDbContext(tx, input.restaurantId);
      const actor = await this.authorized(tx, input);
      const locked = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT "id" FROM "Order"
        WHERE "restaurantId" = ${input.restaurantId} AND "id" = ${input.orderId}
        FOR UPDATE
      `;
      if (locked.length !== 1) throw new LalamoveQuoteError('Pedido não encontrado.', 404);
      const row = await tx.restaurantExternalDeliveryDispatch.findUnique({
        where: { restaurantId_orderId: { restaurantId: input.restaurantId, orderId: input.orderId } },
      });
      if (!row) throw new LalamoveQuoteError('Nenhum despacho parceiro reservado.', 404);
      if (row.status === 'CANCELED') return { dispatch: dto(row), changed: false };
      if (row.status !== 'PREPARED' || row.providerOrderId || row.dispatchedAt) {
        throw new LalamoveQuoteError('Despacho já iniciado ou incerto. É necessário reconciliar antes de liberar o pedido.', 409);
      }
      const updated = await tx.restaurantExternalDeliveryDispatch.updateMany({
        where: { id: row.id, restaurantId: input.restaurantId, status: 'PREPARED',
          providerOrderId: null, dispatchedAt: null, version: row.version },
        data: { status: 'CANCELED', version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new LalamoveQuoteError('Despacho alterado por outra solicitação.', 409);
      await tx.auditLog.create({ data: {
        userId: actor.id, userName: actor.name, userRole: actor.role,
        restaurantId: input.restaurantId, action: 'LALAMOVE_DISPATCH_CANCELED',
        resource: 'LALAMOVE:DISPATCH:' + input.orderId,
        metadata: { environment: 'sandbox', providerBookingCreated: false },
      } });
      return { dispatch: dto({ ...row, status: 'CANCELED' }), changed: true };
    });
    if (result.changed) {
      realtimePublisher.to(`restaurant:${input.restaurantId}:courier`).emit('order:status-changed', {
        id: input.orderId, restaurantId: input.restaurantId,
      });
    }
    return result.dispatch;
  }
}
export default new LalamoveDispatchManagementService();
