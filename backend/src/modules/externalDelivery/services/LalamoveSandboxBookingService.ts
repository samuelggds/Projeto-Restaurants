import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { credentialEncryptionContext, decryptCredential } from '../../restaurantSettings/security/credentialEncryption.js';
import { createLalamoveApiClient, type LalamoveBooking } from '../providers/LalamoveApiClient.js';
import { assertExternalDispatchAllowed } from '../domain/externalDispatchPolicy.js';
import { LalamoveQuoteError } from './LalamoveQuotationService.js';

type Input = { restaurantId: number; actorId: number; orderId: number; expectedVersion: number };
type BookingRequest = {
  credentials: { apiKey: string; apiSecret: string; environment: 'sandbox' };
  quotationId: string; expectedTotal: string; requestId: string;
  sender: { stopId: string; name: string; phone: string };
  recipients: [{ stopId: string; name: string; phone: string }];
};
type Dependencies = { place?: (input: BookingRequest) => Promise<LalamoveBooking> };
const positiveId = (id: unknown) => Number.isSafeInteger(id) && Number(id) > 0 && Number(id) <= 2147483647;

function phone(value: unknown) {
  const digits = String(value ?? '').replace(/\D/gu, '');
  const full = digits.startsWith('55') && digits.length >= 12 ? digits : '55' + digits;
  if (!/^55\d{10,11}$/u.test(full)) throw new LalamoveQuoteError('Contato de entrega inválido.', 409);
  return '+' + full;
}

/**
 * Never automatically retry the provider POST. Inability to verify its outcome
 * must remain UNKNOWN until an independent provider reconciliation is available.
 */
export class LalamoveSandboxBookingService {
  constructor(private readonly deps: Dependencies = {}) {}

  async book(input: Input) {
    if (!positiveId(input.restaurantId) || !positiveId(input.actorId) ||
        !positiveId(input.orderId) || !positiveId(input.expectedVersion)) {
      throw new LalamoveQuoteError('Solicitação de contratação inválida.', 400);
    }
    if (process.env.LALAMOVE_SANDBOX_BOOKING_ENABLED !== 'true') {
      throw new LalamoveQuoteError('Contratação sandbox não habilitada neste servidor.', 403);
    }

    // First reserve exactly one network attempt inside a tenant-scoped transaction.
    const attempt = await prisma.$transaction(async tx => {
      await setTenantDbContext(tx, input.restaurantId);
      const actor = await tx.user.findFirst({
        where: { id: input.actorId, restaurantId: input.restaurantId, role: 'ADMIN', active: true },
        select: { id: true, name: true, role: true },
      });
      if (!actor) throw new LalamoveQuoteError('Acesso exclusivo do administrador.', 403);
      const locked = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT "id" FROM "Order"
        WHERE "id" = ${input.orderId} AND "restaurantId" = ${input.restaurantId} FOR UPDATE
      `;
      if (locked.length !== 1) throw new LalamoveQuoteError('Pedido não encontrado.', 404);
      const order = await tx.order.findFirst({
        where: { id: input.orderId, restaurantId: input.restaurantId },
        select: { restaurantId: true, type: true, status: true, paid: true,
          assignedCourierId: true, payOnDelivery: true, refundStatus: true,
          user: { select: { name: true, phone: true } } },
      });
      if (!order || order.payOnDelivery) throw new LalamoveQuoteError('Pedido inelegível.', 409);
      try {
        assertExternalDispatchAllowed(order, {
          restaurantId: input.restaurantId, deliveryMode: 'PARTNER_ONLY',
          providerConnected: true, providerAccountBelongsToRestaurant: true,
          activeOrUncertainBooking: false,
        });
      } catch {
        throw new LalamoveQuoteError('Pedido não está pronto e pago para entrega parceira.', 409);
      }
      const row = await tx.restaurantExternalDeliveryDispatch.findUnique({
        where: { restaurantId_orderId: { restaurantId: input.restaurantId, orderId: input.orderId } },
      });
      if (!row || row.status !== 'PREPARED' || row.environment !== 'sandbox' ||
          row.version !== input.expectedVersion || row.providerOrderId || row.dispatchedAt) {
        throw new LalamoveQuoteError('Despacho já alterado, contratado ou incerto. Atualize antes de tentar novamente.', 409);
      }
      const quote = await tx.restaurantExternalDeliveryQuote.findFirst({
        where: { id: row.quoteId, orderId: input.orderId, restaurantId: input.restaurantId,
          status: 'APPROVED', expiresAt: { gt: new Date() } },
      });
      if (!quote || quote.currency !== 'BRL' || !quote.total || quote.total.lte(0) ||
          quote.thermalBagRequest !== 'THERMAL_BAG_1' || !quote.approvedByUserId ||
          !quote.quotationId || !quote.pickupStopId || !quote.dropoffStopId) {
        throw new LalamoveQuoteError('Cotação térmica aprovada e válida obrigatória.', 409);
      }
      const credential = await tx.restaurantExternalDeliveryCredential.findFirst({
        where: { id: row.credentialId, restaurantId: input.restaurantId,
          environment: 'sandbox', status: 'VERIFIED_SANDBOX',
          version: quote.credentialVersion, apiKeyEncrypted: { not: null }, apiSecretEncrypted: { not: null } },
        select: { apiKeyEncrypted: true, apiSecretEncrypted: true },
      });
      const restaurant = await tx.restaurant.findFirst({
        where: { id: input.restaurantId, active: true },
        select: { name: true, phone: true },
      });
      if (!credential?.apiKeyEncrypted || !credential.apiSecretEncrypted || !restaurant) {
        throw new LalamoveQuoteError('Credenciais sandbox indisponíveis ou alteradas.', 409);
      }
      const sender = { stopId: quote.pickupStopId, name: restaurant.name, phone: phone(restaurant.phone) };
      const recipients: BookingRequest['recipients'] = [{
        stopId: quote.dropoffStopId, name: order.user?.name || 'Cliente',
        phone: phone(order.user?.phone),
      }];
      const key = (field: string) => credentialEncryptionContext(input.restaurantId, 'LALAMOVE:sandbox:' + field);
      const apiKey = decryptCredential(credential.apiKeyEncrypted, key('apiKey'));
      const apiSecret = decryptCredential(credential.apiSecretEncrypted, key('apiSecret'));
      if (!apiKey || !apiSecret) throw new LalamoveQuoteError('Credenciais sandbox indisponíveis.', 409);

      const updated = await tx.restaurantExternalDeliveryDispatch.updateMany({
        where: { id: row.id, restaurantId: input.restaurantId, orderId: input.orderId,
          status: 'PREPARED', version: row.version, providerOrderId: null, dispatchedAt: null },
        data: { status: 'DISPATCHING', version: { increment: 1 },
          dispatchedAt: new Date(), leaseExpiresAt: new Date(Date.now() + 60_000) },
      });
      if (updated.count !== 1) throw new LalamoveQuoteError('Despacho alterado por outra solicitação.', 409);
      await tx.auditLog.create({ data: {
        restaurantId: input.restaurantId, userId: actor.id, userName: actor.name, userRole: actor.role,
        action: 'LALAMOVE_BOOKING_ATTEMPT_STARTED', resource: 'LALAMOVE:DISPATCH:' + input.orderId,
        metadata: { environment: 'sandbox', requestKey: row.requestKey, providerCallCount: 1 },
      } });
      return {
        id: row.id, version: row.version + 1, requestId: row.requestKey,
        booking: {
          credentials: { apiKey, apiSecret, environment: 'sandbox' as const },
          quotationId: quote.quotationId, expectedTotal: quote.total.toFixed(2),
          requestId: row.requestKey, sender, recipients,
        },
      };
    });

    let booking: LalamoveBooking | null = null;
    try {
      const place = this.deps.place ?? (async (request: BookingRequest) =>
        createLalamoveApiClient(request.credentials).placeOrder({
          quotationId: request.quotationId, expectedTotal: request.expectedTotal,
          requestId: request.requestId, sender: request.sender, recipients: request.recipients,
        }));
      booking = await place(attempt.booking);
    } catch {
      // Even a timeout, HTTP error, or lost connection may conceal a booking.
      // Never revert to PREPARED and never retry blindly.
    }

    try {
      const outcome = await prisma.$transaction(async tx => {
        await setTenantDbContext(tx, input.restaurantId);
        const updated = await tx.restaurantExternalDeliveryDispatch.updateMany({
          where: { id: attempt.id, restaurantId: input.restaurantId,
            version: attempt.version, status: 'DISPATCHING' },
          data: booking
            ? { status: 'ACTIVE', providerOrderId: booking.orderId,
                providerStatus: booking.status, leaseExpiresAt: null, version: { increment: 1 } }
            : { status: 'UNKNOWN', leaseExpiresAt: null, version: { increment: 1 } },
        });
        if (updated.count !== 1) throw new Error('booking state changed concurrently');
        return booking ? 'ACTIVE' : 'UNKNOWN';
      });
      return { status: outcome, canDispatch: false, environment: 'sandbox' as const };
    } catch {
      // If commit failed, DISPATCHING remains blocking. Do not call provider again.
      return { status: 'UNKNOWN', canDispatch: false, environment: 'sandbox' as const };
    }
  }
}
export default new LalamoveSandboxBookingService();
