import type { CheckoutPaymentMethod } from '../domain/checkout';
import * as S from '../../Home/Home.styles';

type Props = {
  count: number;
  total: number;
  loading: boolean;
  paymentMethod: CheckoutPaymentMethod;
  isRestaurantOpen: boolean;
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
  onCheckout,
}: Props) {
  const buttonLabel = loading
    ? 'Processando...'
    : !isRestaurantOpen
      ? 'Restaurante fechado'
      : paymentMethod === 'pix'
        ? '⚡ Gerar código Pix'
        : paymentMethod === 'card'
          ? '💳 Ir para pagamento seguro'
          : '✓ Fazer pedido e pagar na entrega';
  return (
    <div className="cart-checkout-area">
      {count > 0 && (
        <S.CartSummaryRow>
          <span>
            Subtotal ({count} {count === 1 ? 'item' : 'itens'})
          </span>
          <span>{currency(total)}</span>
        </S.CartSummaryRow>
      )}
      <S.CartTotal>
        <span>Total</span>
        <span>{currency(total)}</span>
      </S.CartTotal>
      <S.CartCheckout
        type="button"
        disabled={!count || loading || !isRestaurantOpen}
        onClick={onCheckout}
      >
        {buttonLabel} →
      </S.CartCheckout>
    </div>
  );
}
