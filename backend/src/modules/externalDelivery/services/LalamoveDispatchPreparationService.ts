import { randomUUID } from 'node:crypto';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { assertExternalDispatchAllowed } from '../domain/externalDispatchPolicy.js';
import { LalamoveQuoteError } from './LalamoveQuotationService.js';

type Input = { restaurantId: number; actorId: number; orderId: number; requestKey: string };

/**
 * Record a sandbox-only intent. This does NOT call the partner, charge freight,
 * assign a courier or allow any delivery to start. It is the durable guard
 * needed before implementing an explicit booking command in a later PR.
 */
export class LalamoveDispatchPreparationService {
  async prepare(input: Input) {
    if (![input.restaurantId, input.actorId, input.orderId].every(id =>
      Number.isSafeInteger(id) && id > 0 && id <= 2147483647) ||
      typeof input.requestKey !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(input.requestKey)) {
      throw new LalamoveQuoteError('Solicitação de despacho inválida.', 400);
    }
    return prisma.$transaction(async tx => {
      await setTenantDbContext(tx, input.restaurantId);
      const admin = await tx.user.findFirst({
        where: { id: input.actorId, restaurantId: input.restaurantId, role: 'ADMIN', active: true },
        select: { id: true, name: true, role: true },
      });
      if (!admin) throw new LalamoveQuoteError('Acesso exclusivo do administrador.', 403);

      // Lock the order row before checking who can claim the delivery.
      const locked = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT "id" FROM "Order"
        WHERE "id" = ${input.orderId} AND "restaurantId" = ${input.restaurantId}
        FOR UPDATE
      `;
      if (locked.length !== 1) throw new LalamoveQuoteError('Pedido não encontrado.', 404);
      const order = await tx.order.findFirst({
        where: { id: input.orderId, restaurantId: input.restaurantId },
        select: { restaurantId: true, type: true, status: true, paid: true,
          payOnDelivery: true, assignedCourierId: true, refundStatus: true },
      });
      const previous = await tx.restaurantExternalDeliveryDispatch.findUnique({
        where: { restaurantId_orderId: { restaurantId: input.restaurantId, orderId: input.orderId } },
      });
      if (previous) {
        if (previous.requestKey !== input.requestKey) {
          throw new LalamoveQuoteError('Já existe um despacho reservado para este pedido.', 409);
        }
        return { id: previous.id, status: previous.status, canDispatch: false };
      }
      if (!order || order.payOnDelivery) throw new LalamoveQuoteError('Pedido inelegível.', 409);
      try {
        assertExternalDispatchAllowed(order, {
          restaurantId: input.restaurantId,
          deliveryMode: 'PARTNER_ONLY',
          providerConnected: true,
          providerAccountBelongsToRestaurant: true,
          activeOrUncertainBooking: false,
        });
      } catch {
        throw new LalamoveQuoteError('Pedido não está pronto e pago para entrega parceira.', 409);
      }
      const quote = await tx.restaurantExternalDeliveryQuote.findUnique({
        where: { restaurantId_orderId: { restaurantId: input.restaurantId, orderId: input.orderId } },
      });
      if (!quote || quote.status !== 'APPROVED' || quote.expiresAt <= new Date() ||
          !quote.approvedByUserId || quote.thermalBagRequest !== 'THERMAL_BAG_1' ||
          quote.currency !== 'BRL' || !quote.total || quote.total.lte(0) ||
          !quote.quotationId || !quote.pickupStopId || !quote.dropoffStopId) {
        throw new LalamoveQuoteError('Cotação térmica aprovada e válida obrigatória.', 409);
      }
      const credential = await tx.restaurantExternalDeliveryCredential.findFirst({
        where: { id: quote.credentialId, restaurantId: input.restaurantId,
          version: quote.credentialVersion, environment: 'sandbox',
          status: 'VERIFIED_SANDBOX', apiKeyEncrypted: { not: null }, apiSecretEncrypted: { not: null } },
        select: { id: true },
      });
      if (!credential) throw new LalamoveQuoteError('Credencial sandbox alterada ou revogada.', 409);

      const row = await tx.restaurantExternalDeliveryDispatch.create({
        data: { id: randomUUID(), restaurantId: input.restaurantId, orderId: input.orderId,
          quoteId: quote.id, credentialId: credential.id, requestKey: input.requestKey,
          environment: 'sandbox', status: 'PREPARED' },
        select: { id: true, status: true },
      });
      await tx.auditLog.create({ data: {
        userId: admin.id, userName: admin.name, userRole: admin.role,
        restaurantId: input.restaurantId, action: 'LALAMOVE_DISPATCH_PREPARED',
        resource: 'LALAMOVE:DISPATCH:' + input.orderId,
        metadata: { environment: 'sandbox', bookingCreated: false, thermalBagRequired: true },
      } });
      return { ...row, canDispatch: false };
    });
  }
}

export default new LalamoveDispatchPreparationService();
