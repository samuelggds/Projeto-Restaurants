import type { AdminOrder } from '../types';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function mapAdminOrder(value: unknown): AdminOrder {
  const raw = asRecord(value);
  const user = asRecord(raw.user ?? raw.customer);
  const numericId = Number(raw.id ?? 0);
  const refundStatus = String(raw.refundStatus ?? '').toUpperCase();
  return {
    id: String(raw.orderNumber ?? `#${numericId}`),
    numericId,
    userId: String(raw.userId ?? user.id ?? '') || undefined,
    customerName: String(user.name ?? raw.customerName ?? 'Cliente'),
    customerEmail: String(user.email ?? raw.customerEmail ?? '') || undefined,
    status: String(raw.status ?? 'PENDENTE'),
    total: Number(raw.total ?? raw.totalAmount ?? 0),
    paid: Boolean(raw.paid ?? raw.paymentConfirmed),
    type: String(raw.type ?? raw.orderType ?? ''),
    paymentMethod: String(raw.paymentMethod ?? '') || undefined,
    payOnDelivery: Boolean(raw.payOnDelivery),
    payOnDeliveryMethod: String(raw.payOnDeliveryMethod ?? '') || undefined,
    createdAt: String(raw.createdAt ?? '') || undefined,
    refundStatus: ['NOT_REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED'].includes(refundStatus)
      ? (refundStatus as AdminOrder['refundStatus'])
      : undefined,
    refundRequestedAt: String(raw.refundRequestedAt ?? '') || undefined,
    refundedAt: String(raw.refundedAt ?? '') || undefined,
    refundFailureReason: String(raw.refundFailureReason ?? '') || undefined,
    refundProvider: String(raw.refundProvider ?? '') || undefined,
    refundExternalId: String(raw.refundExternalId ?? '') || undefined,
  };
}
