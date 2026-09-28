import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { CartItemsList } from './components/CartItemsList';
import type { CartItem } from './hooks/useCart';
import type { OrderQuote } from './hooks/useOrderQuote';
import * as S from './FigmaCheckoutFlow.styles';

export type FigmaCheckoutStep = 'cart' | 'address' | 'payment';

type Props = {
  primaryColor: string;
  brandName: string;
  logoUrl?: string;
  step: FigmaCheckoutStep;
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  quote?: OrderQuote | null;
  loading?: boolean;
  canContinue?: boolean;
  addressContent: ReactNode;
  paymentContent: ReactNode;
  couponContent?: ReactNode;
  onStepChange: (step: FigmaCheckoutStep) => void;
  onIncrease: (cartId: string) => void;
  onDecrease: (cartId: string) => void;
  onClear: () => void;
  onClose: () => void;
  onSubmit: () => void;
};

const currency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function stepIndex(step: FigmaCheckoutStep) {
  if (step === 'cart') return 1;
  if (step === 'address') return 2;
  return 3;
}

export function FigmaCheckoutFlow({
  primaryColor,
  brandName,
  logoUrl,
  step,
  cart,
  cartCount,
  cartTotal,
  quote,
  loading = false,
  canContinue = true,
  addressContent,
  paymentContent,
  couponContent,
  onStepChange,
  onIncrease,
  onDecrease,
  onClear,
  onClose,
  onSubmit,
}: Props) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    layerRef.current?.focus();

    return () => {
      previouslyFocused?.focus();
    };
  }, []);

  const currentStep = stepIndex(step);
  const subtotal = quote ? quote.itemsSubtotal + quote.productDiscountTotal : cartTotal;
  const total = quote?.total ?? cartTotal;

  const back = () => {
    if (step === 'payment') {
      onStepChange('address');
      return;
    }
    if (step === 'address') {
      onStepChange('cart');
      return;
    }
    onClose();
  };

  const continueFlow = () => {
    if (step === 'cart') {
      onStepChange('address');
      return;
    }
    if (step === 'address') {
      onStepChange('payment');
      return;
    }
    onSubmit();
  };

  return (
    <S.Layer
      ref={layerRef}
      tabIndex={-1}
      $primary={primaryColor}
      role="dialog"
      aria-modal="true"
      aria-label="Finalizar pedido"
    >
      <S.Top>
        <div className="brand">
          <span className="logo">
            {logoUrl ? <img src={logoUrl} alt="" /> : brandName.slice(0, 1)}
          </span>
          <b>{brandName}</b>
        </div>
        <button className="back" type="button" onClick={back} aria-label="Voltar">
          <ArrowLeft />
        </button>
      </S.Top>

      <S.Shell>
        <S.Progress aria-label={`Etapa ${currentStep} de 3`}>
          <span className="active" />
          <span className={currentStep >= 2 ? 'active' : ''} />
          <span className={currentStep >= 3 ? 'active' : ''} />
        </S.Progress>

        <S.Heading>
          <div>
            <h1>
              {step === 'cart'
                ? 'Meu pedido'
                : step === 'address'
                  ? 'Endereço de entrega'
                  : 'Pagamento'}
            </h1>
            <p>
              {step === 'cart'
                ? 'Revise os itens antes de continuar.'
                : step === 'address'
                  ? 'Confirme como deseja receber o pedido.'
                  : 'Escolha uma forma de pagamento disponível.'}
            </p>
          </div>
          {step === 'cart' && cartCount > 0 ? (
            <button className="clear" type="button" onClick={onClear}>
              Limpar
            </button>
          ) : null}
        </S.Heading>

        <S.TwoColumns>
          <S.Panel>
            {step === 'cart' ? (
              cartCount > 0 ? (
                <>
                  <CartItemsList items={cart} onIncrease={onIncrease} onDecrease={onDecrease} />
                  {couponContent ? <S.StepCard>{couponContent}</S.StepCard> : null}
                </>
              ) : (
                <S.Empty>Seu carrinho está vazio.</S.Empty>
              )
            ) : null}

            {step === 'address' ? (
              <S.StepCard>
                <h2>Entrega</h2>
                {addressContent}
              </S.StepCard>
            ) : null}

            {step === 'payment' ? (
              <S.StepCard>
                <h2>Método de pagamento</h2>
                {paymentContent}
              </S.StepCard>
            ) : null}
          </S.Panel>

          <S.Summary>
            <h2>Resumo do Pedido</h2>
            <div className="row">
              <span>Itens ({cartCount})</span>
              <strong>{currency(subtotal)}</strong>
            </div>
            {quote?.productDiscountTotal ? (
              <div className="row discount">
                <span>Descontos nos produtos</span>
                <strong>− {currency(quote.productDiscountTotal)}</strong>
              </div>
            ) : null}
            {quote?.couponDiscount ? (
              <div className="row discount">
                <span>Cupom{quote.couponCode ? ` · ${quote.couponCode}` : ''}</span>
                <strong>− {currency(quote.couponDiscount)}</strong>
              </div>
            ) : null}
            {quote && (
              <div className="row">
                <span>Taxa de Entrega</span>
                <strong>
                  {quote.deliveryFeeAmount > 0 ? currency(quote.deliveryFeeAmount) : 'Grátis'}
                </strong>
              </div>
            )}
            <div className="line" />
            <div className="row total">
              <span>Total</span>
              <strong>{currency(total)}</strong>
            </div>
          </S.Summary>
        </S.TwoColumns>

        <S.Actions>
          <button className="secondary" type="button" onClick={back}>
            Voltar
          </button>
          <button
            className="primary"
            type="button"
            disabled={!cartCount || !canContinue || loading}
            onClick={continueFlow}
          >
            {loading && step === 'payment' ? 'Processando...' : 'Continuar'}
          </button>
        </S.Actions>
      </S.Shell>
    </S.Layer>
  );
}
