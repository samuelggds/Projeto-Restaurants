import type { CheckoutPaymentMethod } from "../domain/checkout";
import * as S from "../../Home/Home.styles";

type Props = {
  count: number;
  total: number;
  loading: boolean;
  paymentMethod: CheckoutPaymentMethod;
  onCheckout: () => void;
};

const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CartCheckoutSummary({ count, total, loading, paymentMethod, onCheckout }: Props) {
  const buttonLabel = loading
    ? "Processando..."
    : paymentMethod === "pix"
      ? "⚡ Gerar código Pix"
      : paymentMethod === "card"
        ? "💳 Ir para pagamento seguro"
        : "✓ Fazer pedido e pagar na entrega";
  return (
    <>
      {count > 0 && (
        <S.CartSummaryRow>
          <span>Subtotal ({count} {count === 1 ? "item" : "itens"})</span>
          <span>{currency(total)}</span>
        </S.CartSummaryRow>
      )}
      <S.CartTotal><span>Total</span><span>{currency(total)}</span></S.CartTotal>
      <S.CartCheckout type="button" disabled={!count || loading} onClick={onCheckout}>
        {buttonLabel} →
      </S.CartCheckout>
    </>
  );
}
