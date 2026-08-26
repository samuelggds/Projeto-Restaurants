import { createHash } from 'node:crypto';
import type {
  TablePaymentIntentAdminDto,
  TablePaymentIntentDto,
} from '../domain/tableAccountContracts.js';
import type { CreateTablePaymentIntentInput } from '../domain/tableAccountSchemas.js';
import type { TablePaymentIntentRecord } from '../repositories/TablePaymentRepository.js';
import type { TablePaymentIntentAdminRecord } from '../repositories/TablePaymentRepository.js';
import { bigintToMoneyCents } from './tablePaymentLedger.js';

export class TablePaymentError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = 'TABLE_PAYMENT_ERROR',
  ) {
    super(message);
    this.name = 'TablePaymentError';
  }
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function buildTablePaymentRequestFingerprint(
  participantId: number,
  input: CreateTablePaymentIntentInput,
) {
  return sha256(
    JSON.stringify({
      participantId,
      selectionMode: input.selectionMode,
      method: input.method,
      billItemPublicIds: [...(input.billItemPublicIds || [])].sort(),
      splitCount: input.splitCount || null,
      includeOptionalServiceFee: input.includeOptionalServiceFee,
    }),
  );
}

export function serializeTablePaymentIntent(
  record: TablePaymentIntentRecord,
  sessionPublicId: string,
): TablePaymentIntentDto {
  return {
    publicId: record.publicId,
    sessionPublicId,
    payerParticipantPublicId: record.payerParticipant.publicId,
    selectionMode: record.selectionMode,
    method: record.method,
    status: record.status,
    billItemPublicIds: record.allocations.map((allocation) => allocation.tableBillItem.publicId),
    subtotalCents: bigintToMoneyCents(
      record.subtotalCents,
      `subtotal do pagamento ${record.publicId}`,
    ),
    serviceFeeCents: bigintToMoneyCents(
      record.serviceFeeCents,
      `taxa do pagamento ${record.publicId}`,
    ),
    totalCents: bigintToMoneyCents(record.totalCents, `total do pagamento ${record.publicId}`),
    provider: record.provider,
    externalId: record.providerExternalId,
    checkoutUrl: record.providerCheckoutUrl,
    expiresAt: record.expiresAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function readAuditReason(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const reason = (metadata as Record<string, unknown>).reason;
  return typeof reason === 'string' ? reason : null;
}

export function serializeTablePaymentIntentForAdmin(
  record: TablePaymentIntentAdminRecord,
  sessionPublicId: string,
): TablePaymentIntentAdminDto {
  return {
    ...serializeTablePaymentIntent(record, sessionPublicId),
    manualConfirmedAt: record.manualConfirmedAt?.toISOString() || null,
    manualConfirmedByName: record.manualConfirmedBy?.name || null,
    events: record.events.map((event) => ({
      type: event.type,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      provider: event.provider,
      providerEventId: event.providerEventId,
      amountCents:
        event.amountCents === null
          ? null
          : bigintToMoneyCents(event.amountCents, `evento do pagamento ${record.publicId}`),
      actorName: event.actorUser?.name || null,
      reason: readAuditReason(event.metadata),
      occurredAt: event.occurredAt.toISOString(),
    })),
  };
}
