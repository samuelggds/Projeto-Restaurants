type PaymentAmountUnit = 'MAJOR' | 'MINOR';

type PaymentEvidence = {
  expectedAmount: unknown;
  providerAmount: unknown;
  providerCurrency: unknown;
  expectedCurrency?: string;
  providerAmountUnit?: PaymentAmountUnit;
};

function majorAmountToCents(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round((amount + Number.EPSILON) * 100);
}

function minorAmountToCents(value: unknown) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  return amount;
}

export function matchesOrderPaymentEvidence({
  expectedAmount,
  providerAmount,
  providerCurrency,
  expectedCurrency = 'BRL',
  providerAmountUnit = 'MAJOR',
}: PaymentEvidence) {
  const expectedCents = majorAmountToCents(expectedAmount);
  const providerCents =
    providerAmountUnit === 'MINOR'
      ? minorAmountToCents(providerAmount)
      : majorAmountToCents(providerAmount);
  const normalizedProviderCurrency = String(providerCurrency || '')
    .trim()
    .toUpperCase();
  const normalizedExpectedCurrency = String(expectedCurrency || '')
    .trim()
    .toUpperCase();

  return (
    expectedCents !== null &&
    providerCents === expectedCents &&
    Boolean(normalizedExpectedCurrency) &&
    normalizedProviderCurrency === normalizedExpectedCurrency
  );
}
