import { ArrowRight, CreditCard, QrCode, ReceiptText } from 'lucide-react';
import type { CheckoutPaymentMethod } from '../domain/checkout';
import * as S from '../Home.styles';
import * as Summary from './CartCheckoutSummary.styles';
import type { OrderQuote } from '../hooks/useOrderQuote';

type Props = {
  count: number;
  total: number;
  loading: boolean;
  paymentMethod: CheckoutPaymentMethod;
  isRestaurantOpen: boolean;
  checkoutBlockedMessage?: string;
  quote?: OrderQuote | null;
  quoteLoading?: boolean;
  quoteError?: boolean;
  checkoutButtonLabel?: string;
  onCheckout: () => void;
};

const currency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function CartCheckoutSummary({
  count,
  total,
  loading,
  paymentMethod,
  isRestaurantOpen,
  checkoutBlockedMessage,
  quote,
  quoteLoading = false,
  quoteError = false,
  checkoutButtonLabel,
  onCheckout,
}: Props) {
  if (count <= 0) return null;

  const finalTotal = quote?.total ?? total;
  const buttonLabel = loading
    ? 'Processando...'
    : !isRestaurantOpen
      ? 'Restaurante fechado'
      : checkoutBlockedMessage
        ? checkoutBlockedMessage
        : checkoutButtonLabel
          ? checkoutButtonLabel
          : paymentMethod === 'pix'
            ? 'Gerar código Pix'
            : paymentMethod === 'card'
              ? 'Ir para pagamento seguro'
              : 'Fazer pedido e pagar na entrega';
  const CheckoutIcon =
    paymentMethod === 'pix' ? QrCode : paymentMethod === 'card' ? CreditCard : ReceiptText;
  return (
    <div className="cart-checkout-area">
      {count > 0 && (
        <S.CartSummaryRow>
          <span>
            Subtotal ({count} {count === 1 ? 'item' : 'itens'})
          </span>
          <span>{currency(quote ? quote.itemsSubtotal + quote.productDiscountTotal : total)}</span>
        </S.CartSummaryRow>
      )}
      {Boolean(quote?.productDiscountTotal) && (
        <Summary.DiscountRow>
          <span>Descontos nos produtos</span>
          <span>− {currency(quote?.productDiscountTotal || 0)}</span>
        </Summary.DiscountRow>
      )}
      {Boolean(quote?.couponDiscount) && (
        <Summary.DiscountRow>
          <span>Cupom {quote?.couponCode ? `• ${quote.couponCode}` : ''}</span>
          <span>− {currency(quote?.couponDiscount || 0)}</span>
        </Summary.DiscountRow>
      )}
      {Boolean(quote?.deliveryFeeAmount) && (
        <S.CartSummaryRow>
          <span>Taxa de entrega</span>
          <span>{currency(quote?.deliveryFeeAmount || 0)}</span>
        </S.CartSummaryRow>
      )}
      {quoteLoading && count > 0 && (
        <Summary.Hint>Atualizando o total com seus benefícios…</Summary.Hint>
      )}
      {quoteError && count > 0 && (
        <Summary.Hint>
          O valor final será confirmado com segurança antes de criar o pedido.
        </Summary.Hint>
      )}
      <S.CartTotal aria-label={`Total do pedido: ${currency(finalTotal)}`}>
        <span>Total</span>
        <span>{currency(finalTotal)}</span>
      </S.CartTotal>
      <S.CartCheckout
        type="button"
        disabled={loading || !isRestaurantOpen || Boolean(checkoutBlockedMessage)}
        aria-busy={loading}
        onClick={onCheckout}
      >
        <CheckoutIcon aria-hidden="true" />
        <span>{buttonLabel}</span>
        <ArrowRight className="checkout-arrow" aria-hidden="true" />
      </S.CartCheckout>
    </div>
  );
}
