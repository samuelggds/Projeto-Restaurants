import { isApprovedPaymentStatus } from './webhookUtils.js';

type MoneyLike = number | string | bigint | { toString(): string } | null | undefined;

export type ExpectedInvoicePayment = {
  id: number | string;
  paymentExternalId: string | number | null | undefined;
  total: MoneyLike;
};

export type MercadoPagoInvoicePayment = {
  id?: string | number | null;
  status?: unknown;
  external_reference?: unknown;
  transaction_amount?: MoneyLike;
  currency_id?: unknown;
  payment_method_id?: unknown;
};

export type InvoicePaymentValidationResult =
  | { valid: true }
  | {
      valid: false;
      reason:
        | 'INVALID_EXPECTED_INVOICE'
        | 'PAYMENT_ID_MISMATCH'
        | 'EXTERNAL_REFERENCE_MISMATCH'
        | 'PAYMENT_NOT_APPROVED'
        | 'AMOUNT_MISMATCH'
        | 'CURRENCY_MISMATCH'
        | 'PAYMENT_METHOD_MISMATCH';
    };

function normalizeIdentifier(value: unknown) {
  return String(value ?? '').trim();
}

function parseDecimalCents(value: MoneyLike): bigint | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null;
    const scaled = value * 100;
    const rounded = Math.round(scaled);
    if (!Number.isSafeInteger(rounded) || Math.abs(scaled - rounded) > 1e-7) return null;
    return BigInt(rounded);
  }

  const normalized = normalizeIdentifier(value);
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;

  const fraction = String(match[2] || '').padEnd(2, '0');
  return BigInt(match[1]) * 100n + BigInt(fraction || '0');
}

export function validateMercadoPagoInvoicePayment(
  invoice: ExpectedInvoicePayment,
  payment: MercadoPagoInvoicePayment,
): InvoicePaymentValidationResult {
  const invoiceId = normalizeIdentifier(invoice?.id);
  const expectedPaymentId = normalizeIdentifier(invoice?.paymentExternalId);

  if (!invoiceId || !expectedPaymentId) {
    return { valid: false, reason: 'INVALID_EXPECTED_INVOICE' };
  }

  if (normalizeIdentifier(payment?.id) !== expectedPaymentId) {
    return { valid: false, reason: 'PAYMENT_ID_MISMATCH' };
  }

  if (normalizeIdentifier(payment?.external_reference) !== invoiceId) {
    return { valid: false, reason: 'EXTERNAL_REFERENCE_MISMATCH' };
  }

  if (!isApprovedPaymentStatus(payment?.status)) {
    return { valid: false, reason: 'PAYMENT_NOT_APPROVED' };
  }

  const expectedCents = parseDecimalCents(invoice?.total);
  const receivedCents = parseDecimalCents(payment?.transaction_amount);
  if (expectedCents === null || receivedCents === null || expectedCents !== receivedCents) {
    return { valid: false, reason: 'AMOUNT_MISMATCH' };
  }

  if (normalizeIdentifier(payment?.currency_id).toUpperCase() !== 'BRL') {
    return { valid: false, reason: 'CURRENCY_MISMATCH' };
  }

  if (normalizeIdentifier(payment?.payment_method_id).toLowerCase() !== 'pix') {
    return { valid: false, reason: 'PAYMENT_METHOD_MISMATCH' };
  }

  return { valid: true };
}
