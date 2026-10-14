import type { OrderQuote } from '../hooks/useOrderQuote';

export function formatCheckoutCouponLabel(quote: OrderQuote | null) {
  if (quote?.couponDiscountType === 'PERCENTAGE' && quote.couponDiscountValue != null)
    return `Cupom ${quote.couponDiscountValue}%`;
  if (quote?.couponDiscountType === 'FIXED' && quote.couponDiscountValue != null)
    return `Cupom ${Number(quote.couponDiscountValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
  return quote?.couponCode ? `Cupom · ${quote.couponCode}` : undefined;
}
