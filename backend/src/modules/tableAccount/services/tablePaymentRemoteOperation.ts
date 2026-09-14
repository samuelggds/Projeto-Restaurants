import { Prisma, TablePaymentEventType } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { createConfiguredTablePaymentProviderForExisting } from '../providers/ConfiguredTablePaymentProvider.js';
import fakePaymentProvider from '../providers/FakePaymentProvider.js';
import type { PaymentProvider, ProviderPayment } from '../providers/PaymentProvider.js';
import type { TablePaymentIntentRecord } from '../repositories/TablePaymentRepository.js';
import { lockTablePaymentSession } from './tablePaymentLedger.js';
import { sha256, TablePaymentError } from './tablePaymentSupport.js';

type Operation = 'cancel' | 'refund';
export function resolveExistingTablePaymentProvider(intent: TablePaymentIntentRecord, injected: PaymentProvider | null = null) {
  const provider = injected || (intent.provider === 'FAKE_TABLE' ? fakePaymentProvider :
    createConfiguredTablePaymentProviderForExisting({
      restaurantId: intent.restaurantId, participantId: intent.payerParticipantId,
      participantUserId: null, participantName: null, participantPhone: null,
      intentId: intent.id, intentPublicId: intent.publicId, method: intent.method as 'PIX' | 'CARD',
    }, intent.provider || ''));
  if (!intent.providerExternalId || provider.code !== intent.provider) {
    throw new TablePaymentError('Provedor ou referência do pagamento não corresponde.', 409, 'TABLE_PAYMENT_PROVIDER_MISMATCH');
  }
  return provider;
}

export function matchesTablePaymentEvidence(intent: TablePaymentIntentRecord, payment: ProviderPayment) {
  return payment.externalId === intent.providerExternalId &&
    Number.isSafeInteger(payment.amountCents) && payment.amountCents > 0 &&
    payment.amountCents === Number(intent.totalCents);
}

/** Claim durável antes da rede. Repetições apenas conciliam; nunca repetem uma
 * mutação ambígua em gateways sem idempotência. Uma queda antes do envio exige
 * revisão manual. O mesmo pagamento usa uma única chave de estorno (admin/tardio).
 */
export async function executeTablePaymentRemoteOperation(
  intent: TablePaymentIntentRecord,
  operation: Operation,
  injected: PaymentProvider | null = null,
) {
  const deduplicationKey = `table-payment:${intent.publicId}:remote-${operation}`;
  const claim = await prisma.$transaction(async (tx) => {
    await setTenantDbContext(tx, intent.restaurantId);
    await lockTablePaymentSession(tx, intent.restaurantId, intent.tableSessionId);
    const existing = await tx.tablePaymentEvent.findUnique({ where: { deduplicationKey }, select: { id: true, metadata: true } });
    if (existing) return { firstAttempt: false, confirmed: (existing.metadata as { state?: string } | null)?.state === 'CONFIRMED' };
    await tx.tablePaymentEvent.create({ data: {
      restaurantId: intent.restaurantId, tableSessionId: intent.tableSessionId,
      paymentIntentId: intent.id, deduplicationKey, type: TablePaymentEventType.PROVIDER_WEBHOOK,
      provider: intent.provider, fromStatus: intent.status, toStatus: intent.status,
      amountCents: intent.totalCents, metadata: { operation, state: 'PENDING', manualReviewRequired: true },
    } });
    return { firstAttempt: true, confirmed: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  const { firstAttempt } = claim;
  if (claim.confirmed) return { confirmed: true, payment: null, manualReviewRequired: false, idempotentReplay: true };

  let payment: ProviderPayment | null = null;
  let failureCode: string | null = null;
  try {
    const provider = resolveExistingTablePaymentProvider(intent, injected);
    const externalId = intent.providerExternalId!;
    payment = firstAttempt
      ? await provider[operation === 'refund' ? 'refundPayment' : 'cancelPayment']({ externalId, idempotencyKey: sha256(deduplicationKey) })
      : await provider.getPayment(externalId);
    if (!matchesTablePaymentEvidence(intent, payment)) {
      payment = null;
      failureCode = 'PROVIDER_EVIDENCE_MISMATCH';
    }
  } catch {
    // Não registrar mensagens de SDK que possam conter credenciais/respostas.
    failureCode = 'PROVIDER_OPERATION_UNCONFIRMED';
  }
  const confirmed = Boolean(payment && (operation === 'refund'
    ? payment.status === 'REFUNDED'
    : ['CANCELED', 'EXPIRED', 'FAILED', 'REFUNDED'].includes(payment.status)));
  await prisma.tablePaymentEvent.updateMany({ where: { deduplicationKey, NOT: { metadata: { path: ['state'], equals: 'CONFIRMED' } } }, data: {
    metadata: { operation, state: confirmed ? 'CONFIRMED' : 'PENDING', manualReviewRequired: !confirmed, failureCode },
  } });
  return { confirmed, payment, manualReviewRequired: !confirmed, idempotentReplay: !firstAttempt };
}
