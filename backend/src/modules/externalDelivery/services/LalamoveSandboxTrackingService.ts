import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { decryptCredential, credentialEncryptionContext } from '../../restaurantSettings/security/credentialEncryption.js';
import { createLalamoveApiClient, type LalamoveBooking } from '../providers/LalamoveApiClient.js';
import { LalamoveQuoteError } from './LalamoveQuotationService.js';

type Input = { restaurantId: number; actorId: number; orderId: number };
type Lookup = (input: {
  credentials: { apiKey: string; apiSecret: string; environment: 'sandbox' };
  providerOrderId: string;
}) => Promise<LalamoveBooking>;

const positive = (x: number) => Number.isSafeInteger(x) && x > 0 && x <= 2147483647;
const recognized = /^[A-Z][A-Z0-9_]{1,63}$/u;
type Snapshot = { id: string; status: string; providerStatus: string | null;
  providerOrderId: string | null; version: number };
function response(row: Snapshot) {
  return {
    id: row.id, status: row.status, providerStatus: row.providerStatus,
    environment: 'sandbox' as const, canDispatch: false as const,
    reconciliationRequired: row.status === 'UNKNOWN' || row.status === 'DISPATCHING',
  };
}

/**
 * Read-only provider lookup and versioned tenant-scoped reconciliation.
 * Never issues POST /orders, DELETE /orders, refunds or dispatches couriers.
 */
export class LalamoveSandboxTrackingService {
  constructor(private readonly deps: { lookup?: Lookup } = {}) {}
  async refresh(input: Input) {
    if (![input.restaurantId, input.actorId, input.orderId].every(positive)) {
      throw new LalamoveQuoteError('Solicitação inválida.', 400);
    }
    const snapshot = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await setTenantDbContext(tx, input.restaurantId);
      const actor = await tx.user.findFirst({
        where: { id: input.actorId, restaurantId: input.restaurantId, role: 'ADMIN', active: true },
        select: { id: true, name: true, role: true },
      });
      if (!actor) throw new LalamoveQuoteError('Acesso exclusivo do administrador.', 403);
      const row = await tx.restaurantExternalDeliveryDispatch.findUnique({
        where: { restaurantId_orderId: { restaurantId: input.restaurantId, orderId: input.orderId } },
      });
      if (!row) throw new LalamoveQuoteError('Despacho não encontrado.', 404);
      if (row.environment !== 'sandbox' || !['ACTIVE','UNKNOWN','DISPATCHING'].includes(row.status)) {
        throw new LalamoveQuoteError('Despacho não disponível para rastreamento.', 409);
      }
      if (!row.providerOrderId) {
        // No provider identifier: retrying POST or assuming cancellation could double-book.
        throw new LalamoveQuoteError('Resultado incerto sem ID externo. Solicite conciliação manual; nenhuma nova entrega será contratada.', 409);
      }
      if (!/^[0-9]{1,24}$/u.test(row.providerOrderId)) {
        throw new LalamoveQuoteError('Identificador externo inválido.', 409);
      }
      const credential = await tx.restaurantExternalDeliveryCredential.findFirst({
        where: { id: row.credentialId, restaurantId: input.restaurantId,
          environment: 'sandbox', status: 'VERIFIED_SANDBOX',
          apiKeyEncrypted: { not: null }, apiSecretEncrypted: { not: null } },
        select: { apiKeyEncrypted: true, apiSecretEncrypted: true },
      });
      if (!credential?.apiKeyEncrypted || !credential.apiSecretEncrypted) {
        throw new LalamoveQuoteError('Conexão sandbox indisponível ou revogada.', 409);
      }
      const decrypt = (value: string, field: string) =>
        decryptCredential(value, credentialEncryptionContext(input.restaurantId, 'LALAMOVE:sandbox:' + field));
      const apiKey = decrypt(credential.apiKeyEncrypted, 'apiKey');
      const apiSecret = decrypt(credential.apiSecretEncrypted, 'apiSecret');
      if (!apiKey || !apiSecret) throw new LalamoveQuoteError('Credenciais indisponíveis.', 409);
      return {
        id: row.id, version: row.version, providerOrderId: row.providerOrderId,
        status: row.status, credentials: { apiKey, apiSecret, environment: 'sandbox' as const },
        actor,
      };
    });

    let details: LalamoveBooking;
    try {
      const lookup = this.deps.lookup ?? (async (args: { credentials: typeof snapshot.credentials; providerOrderId: string }) =>
        createLalamoveApiClient(args.credentials).orderDetails(args.providerOrderId));
      details = await lookup({ credentials: snapshot.credentials, providerOrderId: snapshot.providerOrderId });
    } catch {
      // Do not downgrade a known booking on network failures.
      throw new LalamoveQuoteError('Consulta de rastreamento indisponível. Tente consultar novamente.', 503);
    }
    if (details.orderId !== snapshot.providerOrderId || !recognized.test(details.status)) {
      throw new LalamoveQuoteError('Resposta de rastreamento incompatível com a contratação.', 409);
    }
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await setTenantDbContext(tx, input.restaurantId);
      // Recheck actor authorization after the external network call.
      const actor = await tx.user.findFirst({
        where: { id: input.actorId, restaurantId: input.restaurantId, role: 'ADMIN', active: true },
        select: { id: true },
      });
      if (!actor) throw new LalamoveQuoteError('Acesso exclusivo do administrador.', 403);
      const changed = await tx.restaurantExternalDeliveryDispatch.updateMany({
        where: { id: snapshot.id, restaurantId: input.restaurantId, orderId: input.orderId,
          version: snapshot.version, providerOrderId: snapshot.providerOrderId,
          status: { in: ['ACTIVE','UNKNOWN','DISPATCHING'] } },
        // Provider status is informational only. Do not release the local courier
        // claim or mutate Order/payment/compensation based on a GET result.
        data: { providerStatus: details.status, version: { increment: 1 } },
      });
      if (changed.count !== 1) throw new LalamoveQuoteError('Rastreamento alterado simultaneamente. Atualize.', 409);
      const row = await tx.restaurantExternalDeliveryDispatch.findUniqueOrThrow({
        where: { id: snapshot.id, restaurantId: input.restaurantId },
        select: { id: true, status: true, providerStatus: true, providerOrderId: true, version: true },
      });
      await tx.auditLog.create({ data: {
        userId: snapshot.actor.id, userName: snapshot.actor.name, userRole: snapshot.actor.role,
        restaurantId: input.restaurantId, action: 'LALAMOVE_SANDBOX_STATUS_REFRESHED',
        resource: 'LALAMOVE:DISPATCH:' + input.orderId,
        metadata: { environment: 'sandbox', providerStatus: details.status },
      } });
      return response(row);
    });
  }
}

export default new LalamoveSandboxTrackingService();
