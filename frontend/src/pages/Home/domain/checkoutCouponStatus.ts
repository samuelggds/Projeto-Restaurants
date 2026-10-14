import type { OrderQuote } from '../hooks/useOrderQuote';

type CouponQuoteState = {
  requestedCode: string;
  redemptionId: number | null;
  quote: OrderQuote | null;
  loading: boolean;
  error: string | null;
};

export function resolveCheckoutCouponStatus({
  requestedCode, redemptionId, quote, loading, error,
}: CouponQuoteState) {
  const requested = Boolean(requestedCode || redemptionId);
  const confirmedCode = String(quote?.couponCode || '');
  const confirmed = Boolean(
    requested && confirmedCode &&
    (!requestedCode || confirmedCode.toUpperCase() === requestedCode.trim().toUpperCase()),
  );
  const pending = requested && loading;
  return {
    requested,
    confirmedCode,
    confirmed,
    pending,
    error: requested ? error : null,
    blocked: requested && (!confirmed || pending || Boolean(error)),
  };
}
