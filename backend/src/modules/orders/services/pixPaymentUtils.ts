import type { PixProvider } from '../../payments/providers/providerCatalog.js';

export function normalizeReferenceToken(value: string | number | null | undefined) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function doesProofContainTransactionId(paymentProof: string, transactionId: string) {
  const normalizedProof = normalizeReferenceToken(paymentProof);
  const normalizedTransactionId = normalizeReferenceToken(transactionId);
  return Boolean(
    normalizedProof &&
      normalizedTransactionId &&
      normalizedProof.includes(normalizedTransactionId),
  );
}

export function toCurrencyCents(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round((amount + Number.EPSILON) * 100);
}

export type ParsedManualPixPaymentId = {
  provider: PixProvider;
  restaurantId: number;
  createdAt: Date;
  transactionId: string;
};
