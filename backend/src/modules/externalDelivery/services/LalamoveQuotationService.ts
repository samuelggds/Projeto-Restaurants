import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import {
  credentialEncryptionContext, decryptCredential,
} from '../../restaurantSettings/security/credentialEncryption.js';
import googleGeocoder from '../../orders/services/GoogleAddressGeocodingService.js';
import { createLalamoveApiClient, type LalamoveQuotation, type LalamoveStop } from '../providers/LalamoveApiClient.js';

export class LalamoveQuoteError extends Error {
  constructor(message: string, readonly statusCode = 409) { super(message); }
}
type QuoteInput = { restaurantId: number; actorId: number; orderId: number };
type Address = { address: string | null; number: string | null; district: string | null; city: string | null; state: string | null };
const requestSchema = z.object({ requestKey: z.string().uuid() }).strict();
const decisionSchema = z.object({
  expectedVersion: z.number().int().positive(),
  expectedTotal: z.string().regex(/^\d{1,8}\.\d{2}$/),
}).strict();
const positiveId = (value: unknown): number => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) throw new LalamoveQuoteError('Identificador inválido.', 400);
  return id;
};
function addressLabel(a: Address) {
  const values = [a.address, a.number, a.district, a.city, a.state].map(v => String(v || '').trim());
  if (values.some(v => !v) || values.some(v => v.length > 180)) throw new LalamoveQuoteError('Endereço incompleto para cotação.', 422);
  return values.join(', ') + ', Brasil';
}
async function resolveStop(a: Address): Promise<LalamoveStop> {
  // Do not trust client coordinates. If geocoding is ambiguous, refuse the quotation.
  addressLabel(a);
  const exact = await googleGeocoder.execute(a);
  if (!exact || exact.partialMatch || !['ROOFTOP', 'RANGE_INTERPOLATED'].includes(exact.locationType)) {
    throw new LalamoveQuoteError('Confirme os endereços no mapa antes de consultar o frete.', 422);
  }
  return { address: addressLabel(a), coordinates: {
    lat: String(exact.latitude), lng: String(exact.longitude),
  } };
}
function fingerprint(origin: Address, target: Address) {
  return createHash('sha256').update(JSON.stringify({ origin, target })).digest('hex');
}
function dto(row: {
  id: string; status: string; version: number; total: Prisma.Decimal | null;
  currency: string | null; expiresAt: Date; quotationId: string | null;
  serviceType: string | null; approvedAt: Date | null;
}) {
  const valid = row.expiresAt.getTime() > Date.now();
  return {
    id: row.id,
    status: !valid && ['AVAILABLE', 'APPROVED'].includes(row.status) ? 'EXPIRED' : row.status,
    version: row.version, total: row.total?.toFixed(2) ?? null,
    currency: row.currency, expiresAt: row.expiresAt.toISOString(),
    serviceType: row.serviceType, thermalBagRequired: true,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    canDispatch: false, environment: 'sandbox' as const,
  };
}
type Dependencies = {
  geocode?: (a: Address) => Promise<LalamoveStop>;
  quote?: (creds: { apiKey: string; apiSecret: string; environment: 'sandbox' }, city: string, stops: [LalamoveStop,LalamoveStop]) => Promise<LalamoveQuotation>;
};
export class LalamoveQuotationService {
  constructor(private readonly deps: Dependencies = {}) {}
  private async authorized(input: QuoteInput) {
    const restaurantId = positiveId(input.restaurantId);
    const actorId = positiveId(input.actorId);
    const orderId = positiveId(input.orderId);
    return withTenantDbContext(restaurantId, async tx => {
      const admin = await tx.user.findFirst({
        where: { id: actorId, restaurantId, role: 'ADMIN', active: true }, select: { id: true, name: true, role: true },
      });
      if (!admin) throw new LalamoveQuoteError('Somente o ADMIN do restaurante pode consultar fretes.', 403);
      const order = await tx.order.findFirst({
        where: { id: orderId, restaurantId, type: 'DELIVERY' },
        select: {
          id: true, status: true, paid: true, payOnDelivery: true, assignedCourierId: true,
          address: true, number: true, district: true, city: true, state: true,
        },
      });
      if (!order || !order.paid || order.payOnDelivery || order.assignedCourierId ||
        !['PENDENTE', 'PREPARANDO', 'PRONTO'].includes(order.status)) {
        throw new LalamoveQuoteError('Pedido indisponível para cotação de frete parceiro.', 409);
      }
      const restaurant = await tx.restaurant.findFirst({
        where: { id: restaurantId, active: true },
        select: { address: true, addressNumber: true, addressDistrict: true, city: true, state: true },
      });
      if (!restaurant) throw new LalamoveQuoteError('Restaurante indisponível.', 409);
      const origin = { address: restaurant.address, number: restaurant.addressNumber,
        district: restaurant.addressDistrict, city: restaurant.city, state: restaurant.state };
      const target = { address: order.address, number: order.number,
        district: order.district, city: order.city, state: order.state };
      addressLabel(origin); addressLabel(target);
      const credential = await tx.restaurantExternalDeliveryCredential.findUnique({
        where: { restaurantId_provider_environment: { restaurantId, provider: 'LALAMOVE', environment: 'sandbox' } },
        select: { id: true, version: true, status: true, apiKeyEncrypted: true, apiSecretEncrypted: true },
      });
      if (!credential || credential.status !== 'VERIFIED_SANDBOX' ||
        !credential.apiKeyEncrypted || !credential.apiSecretEncrypted) {
        throw new LalamoveQuoteError('Conexão sandbox Lalamove não validada.', 409);
      }
      return { admin, orderId, restaurantId, origin, target, credential,
        digest: fingerprint(origin, target) };
    });
  }
  async current(input: QuoteInput) {
    const { restaurantId, orderId } = await this.authorized(input);
    const row = await withTenantDbContext(restaurantId, tx => tx.restaurantExternalDeliveryQuote.findUnique({
      where: { restaurantId_orderId: { restaurantId, orderId } },
    }));
    return row ? dto(row) : null;
  }
  async request(input: QuoteInput, payload: unknown) {
    const parsed = requestSchema.safeParse(payload);
    if (!parsed.success) throw new LalamoveQuoteError('Solicitação de cotação inválida.', 400);
    const ctx = await this.authorized(input);
    const { restaurantId, orderId, credential, digest } = ctx;
    const quoteKey = parsed.data.requestKey;
    const initial = await withTenantDbContext(restaurantId, async tx => {
      const previous = await tx.restaurantExternalDeliveryQuote.findUnique({
        where: { restaurantId_orderId: { restaurantId, orderId } },
      });
      if (previous && previous.requestKey === quoteKey) return { row: previous, fresh: false };
      if (previous && ['REQUESTING', 'AVAILABLE', 'APPROVED'].includes(previous.status) &&
        previous.expiresAt > new Date()) {
        if (previous.addressDigest !== digest || previous.credentialVersion !== credential.version) {
          throw new LalamoveQuoteError('Endereço ou conta modificados. Aguarde a cotação expirar.', 409);
        }
        return { row: previous, fresh: false };
      }
      const expiresAt = new Date(Date.now() + 30000);
      if (previous) {
        const changed = await tx.restaurantExternalDeliveryQuote.updateMany({
          where: { id: previous.id, restaurantId, version: previous.version,
            OR: [{ expiresAt: { lte: new Date() } }, { status: { in: ['FAILED','EXPIRED','REJECTED'] } }] },
          data: { requestKey: quoteKey, credentialId: credential.id, credentialVersion: credential.version,
            addressDigest: digest, status: 'REQUESTING', quotationId: null, serviceType: null,
            total: null, currency: null, pickupStopId: null, dropoffStopId: null,
            expiresAt, approvedAt: null, approvedByUserId: null, requestedAt: new Date(),
            version: { increment: 1 } },
        });
        if (changed.count !== 1) throw new LalamoveQuoteError('Cotação concorrente. Atualize.', 409);
        const row = await tx.restaurantExternalDeliveryQuote.findUniqueOrThrow({ where: { id: previous.id } });
        return { row, fresh: true };
      }
      const row = await tx.restaurantExternalDeliveryQuote.create({
        data: { restaurantId, orderId, credentialId: credential.id, credentialVersion: credential.version,
          requestKey: quoteKey, addressDigest: digest, status: 'REQUESTING', expiresAt },
      });
      return { row, fresh: true };
    });
    if (!initial.fresh) return dto(initial.row);
    let quote: LalamoveQuotation;
    try {
      const makeStop = this.deps.geocode ?? resolveStop;
      const stops = await Promise.all([makeStop(ctx.origin), makeStop(ctx.target)]) as [LalamoveStop, LalamoveStop];
      const decrypt = (value: string, field: string) => decryptCredential(value,
        credentialEncryptionContext(restaurantId, 'LALAMOVE:sandbox:' + field));
      const apiKey = decrypt(credential.apiKeyEncrypted, 'apiKey');
      const apiSecret = decrypt(credential.apiSecretEncrypted, 'apiSecret');
      if (!apiKey || !apiSecret) throw new Error('missing credentials');
      const build = this.deps.quote ?? ((creds, city, points) => createLalamoveApiClient(creds).quotation({
        cityName: city, stops: points,
      }));
      quote = await build({ apiKey, apiSecret, environment: 'sandbox' }, String(ctx.origin.city), stops);
      if (!quote.thermalBagRequired || quote.currency !== 'BRL' ||
        !['LALAGO','LALAPRO'].includes(quote.serviceType) ||
        !/^[0-9]+(?:\.[0-9]{1,2})?$/.test(quote.total) ||
        !Number.isFinite(Number(quote.total)) || Number(quote.total) <= 0 ||
        quote.expiresAt.getTime() <= Date.now()) throw new Error('Invalid provider quotation');
    } catch {
      await withTenantDbContext(restaurantId, async tx => {
        await tx.restaurantExternalDeliveryQuote.updateMany({
          where: { id: initial.row.id, restaurantId, version: initial.row.version, status: 'REQUESTING' },
          data: { status: 'FAILED', version: { increment: 1 } },
        });
      });
      throw new LalamoveQuoteError('Cotação térmica indisponível. Verifique o endereço e a cobertura.', 422);
    }
    return withTenantDbContext(restaurantId, async tx => {
      const order = await tx.order.findFirst({
        where: { id: orderId, restaurantId, type: 'DELIVERY', paid: true, payOnDelivery: false,
          assignedCourierId: null, status: { in: ['PENDENTE','PREPARANDO','PRONTO'] } },
        select: { id: true, address: true, number: true, district: true, city: true, state: true },
      });
      const restaurant = await tx.restaurant.findFirst({
        where: { id: restaurantId, active: true },
        select: { address: true, addressNumber: true, addressDistrict: true, city: true, state: true },
      });
      const currentCredential = await tx.restaurantExternalDeliveryCredential.findFirst({
        where: { id: credential.id, restaurantId, version: credential.version, status: 'VERIFIED_SANDBOX' },
        select: { id: true },
      });
      const currentDigest = order && restaurant ? fingerprint({
        address: restaurant.address, number: restaurant.addressNumber, district: restaurant.addressDistrict,
        city: restaurant.city, state: restaurant.state,
      }, { address: order.address, number: order.number, district: order.district,
        city: order.city, state: order.state }) : null;
      if (!order || !restaurant || !currentCredential || currentDigest !== digest) {
        throw new LalamoveQuoteError('Pedido ou conta alterados durante a cotação.', 409);
      }
      const count = await tx.restaurantExternalDeliveryQuote.updateMany({
        where: { id: initial.row.id, restaurantId, version: initial.row.version, status: 'REQUESTING',
          requestKey: quoteKey, credentialVersion: credential.version },
        data: { status: 'AVAILABLE', quotationId: quote.quotationId, total: quote.total,
          serviceType: quote.serviceType, currency: 'BRL', pickupStopId: quote.pickupStopId,
          dropoffStopId: quote.dropoffStopId, expiresAt: quote.expiresAt, version: { increment: 1 } },
      });
      if (count.count !== 1) throw new LalamoveQuoteError('Cotação substituída durante a consulta.', 409);
      await tx.auditLog.create({ data: {
        userId: ctx.admin.id, userName: ctx.admin.name, userRole: ctx.admin.role, restaurantId,
        action: 'LALAMOVE_QUOTE_CREATED', resource: 'LALAMOVE:QUOTE:' + orderId,
        metadata: { orderId, currency: 'BRL', environment: 'sandbox', thermalBag: true },
      } });
      return dto(await tx.restaurantExternalDeliveryQuote.findUniqueOrThrow({
        where: { id: initial.row.id },
      }));
    });
  }
  async approve(input: QuoteInput, payload: unknown) {
    const parsed = decisionSchema.safeParse(payload);
    if (!parsed.success) throw new LalamoveQuoteError('Confirmação inválida.', 400);
    const ctx = await this.authorized(input);
    const { restaurantId, orderId, credential, digest } = ctx;
    return withTenantDbContext(restaurantId, async tx => {
      const row = await tx.restaurantExternalDeliveryQuote.findUnique({
        where: { restaurantId_orderId: { restaurantId, orderId } },
      });
      if (!row || row.status !== 'AVAILABLE' || row.version !== parsed.data.expectedVersion ||
        row.expiresAt <= new Date() || row.addressDigest !== digest ||
        row.credentialId !== credential.id || row.credentialVersion !== credential.version ||
        row.total?.toFixed(2) !== parsed.data.expectedTotal || row.currency !== 'BRL') {
        throw new LalamoveQuoteError('Valor, validade ou versão da cotação divergente. Consulte novamente.', 409);
      }
      const updated = await tx.restaurantExternalDeliveryQuote.updateMany({
        where: { id: row.id, restaurantId, version: row.version, status: 'AVAILABLE', expiresAt: { gt: new Date() } },
        data: { status: 'APPROVED', approvedAt: new Date(), approvedByUserId: ctx.admin.id,
          version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new LalamoveQuoteError('Aprovação concorrente.', 409);
      await tx.auditLog.create({ data: {
        userId: ctx.admin.id, userName: ctx.admin.name, userRole: ctx.admin.role, restaurantId,
        action: 'LALAMOVE_QUOTE_APPROVED', resource: 'LALAMOVE:QUOTE:' + orderId,
        metadata: { orderId, environment: 'sandbox', thermalBag: true },
      } });
      return dto(await tx.restaurantExternalDeliveryQuote.findUniqueOrThrow({ where: { id: row.id } }));
    });
  }
}
export default new LalamoveQuotationService();
