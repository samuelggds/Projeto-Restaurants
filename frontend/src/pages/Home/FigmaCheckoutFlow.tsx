import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  BatteryFull,
  Search,
  ShoppingBag,
  Signal,
  Ticket,
  UserRound,
  Wifi,
} from 'lucide-react';
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
  onRemove?: (cartId: string) => void;
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
  onRemove,
  onClear,
  onClose,
  onSubmit,
}: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [couponOpen, setCouponOpen] = useState(true);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    layerRef.current?.focus();

    return () => {
      previouslyFocused?.focus();
    };
  }, []);

  const currentStep = stepIndex(step);
  const subtotal = quote ? quote.itemsSubtotal + quote.productDiscountTotal : cartTotal;
  const deliveryFee = quote?.deliveryFeeAmount ?? 0;
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

  if (step === 'cart') {
    return (
      <S.CartLayer
        ref={layerRef}
        tabIndex={-1}
        $primary={primaryColor}
        role="dialog"
        aria-modal="true"
        aria-label="Finalizar pedido"
      >
        <S.MobileStatusBar aria-hidden="true">
          <strong>9:41</strong>
          <div>
            <Signal />
            <Wifi />
            <BatteryFull />
          </div>
        </S.MobileStatusBar>

        <S.CartDesktopHeader>
          <button className="brand" type="button" onClick={onClose} aria-label={brandName}>
            <span className="logo">
              {logoUrl ? <img src={logoUrl} alt="" /> : brandName.slice(0, 1)}
            </span>
            <span className="brand-copy">
              <b>{brandName}</b>
              <small><i /> Aberto agora · 25-35 min</small>
            </span>
          </button>

          <div className="search" aria-label="Buscar no cardápio">
            <Search aria-hidden="true" />
            <span>Buscar no cardápio do {brandName.split(' ')[0]}...</span>
          </div>

          <div className="actions">
            <button className="account" type="button">
              <UserRound aria-hidden="true" />
              <span>Olá, Entrar</span>
            </button>
            <button className="cart" type="button">
              <ShoppingBag aria-hidden="true" />
              <span>Meu Carrinho</span>
              {cartCount > 0 ? <i>{cartCount}</i> : null}
            </button>
          </div>
        </S.CartDesktopHeader>

        <S.CartContent>
          <S.CartItemsColumn>
            <S.CartTitleRow>
              <h1 className="desktop-title">Seu Carrinho de Compras</h1>
              <h1 className="mobile-title">Meu pedido</h1>
              {cartCount > 0 ? (
                <button type="button" onClick={onClear}>
                  <span className="desktop-clear">Limpar Carrinho</span>
                  <span className="mobile-clear">Limpar</span>
                </button>
              ) : null}
            </S.CartTitleRow>

            {cartCount > 0 ? (
              <>
                <span className="compat-items-count">Itens ({cartCount})</span>
                <CartItemsList
                items={cart}
                onIncrease={onIncrease}
                onDecrease={onDecrease}
                  onRemove={onRemove}
                />
              </>
            ) : (
              <S.CartEmpty>Seu carrinho está vazio.</S.CartEmpty>
            )}

            {cartCount > 0 ? (
              <S.MobileCartSummary>
                <button
                  className="coupon-trigger"
                  type="button"
                  onClick={() => setCouponOpen((value) => !value)}
                  aria-expanded={couponOpen}
                >
                  <Ticket aria-hidden="true" />
                  <span>{quote?.couponCode ? quote.couponCode : 'Cupom de desconto'}</span>
                  <b>{quote?.couponCode ? 'Aplicado' : 'Aplicar'}</b>
                </button>

                {couponOpen && couponContent ? (
                  <div className="coupon-details">{couponContent}</div>
                ) : null}

                <div className="summary-row">
                  <span>Subtotal</span>
                  <strong>{currency(subtotal)}</strong>
                </div>
                <div className="summary-row">
                  <span>Taxa de entrega</span>
                  <strong>{deliveryFee > 0 ? currency(deliveryFee) : 'Grátis'}</strong>
                </div>
                <div className="summary-divider" />
                <div className="summary-total">
                  <span>Total</span>
                  <strong>{currency(total)}</strong>
                </div>
              </S.MobileCartSummary>
            ) : null}
          </S.CartItemsColumn>

          {cartCount > 0 ? (
            <S.CartSummarySidebar>
              <h2>Resumo do Pedido</h2>

              <button
                className="coupon-trigger"
                type="button"
                onClick={() => setCouponOpen((value) => !value)}
                aria-expanded={couponOpen}
              >
                <Ticket aria-hidden="true" />
                <span>{quote?.couponCode ? quote.couponCode : 'Cupom de desconto...'}</span>
                <b>{quote?.couponCode ? 'Aplicado' : 'Aplicar'}</b>
              </button>

              {couponOpen && couponContent ? (
                <div className="coupon-details">{couponContent}</div>
              ) : null}

              <div className="summary-divider" />

              <div className="summary-list">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <strong>{currency(subtotal)}</strong>
                </div>
                <div className="summary-row">
                  <span>Taxa de Entrega</span>
                  <strong>{deliveryFee > 0 ? currency(deliveryFee) : 'Grátis'}</strong>
                </div>
                <div className="summary-divider" />
                <div className="summary-total">
                  <span>Total Geral</span>
                  <strong>{currency(total)}</strong>
                </div>
              </div>

              <button
                className="continue"
                type="button"
                disabled={!cartCount || !canContinue || loading}
                onClick={continueFlow}
              >
                Continuar
              </button>
            </S.CartSummarySidebar>
          ) : null}
        </S.CartContent>

        <S.CartDesktopFooter>
          <div className="footer-main">
            <section className="platform">
              <div className="platform-brand">
                <span>G</span>
                <strong>GastroNexa</strong>
              </div>
              <p>
                Sua experiência gourmet completa, direto do conforto de sua casa. O melhor do {brandName} entregue rápido.
              </p>
            </section>

            <section>
              <h3>Nossos Links</h3>
              <p>Cardápio</p>
              <p>Cupons Ativos</p>
              <p>Perguntas Frequentes</p>
            </section>

            <section>
              <h3>Suporte</h3>
              <p>Falar no Chat</p>
              <p>Central de Ajuda</p>
              <p>Termos de Serviço</p>
            </section>

            <section>
              <h3>Sua Loja Segura</h3>
              <p>
                GastroNexa é multi-tenant. Cada restaurante é operado diretamente por seu administrador autorizado.
              </p>
            </section>
          </div>

          <div className="footer-divider" />

          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} GastroNexa & {brandName}. Todos os direitos reservados.</span>
            <span className="legal"><span>Privacidade</span><span>Cookies</span></span>
          </div>
        </S.CartDesktopFooter>

        <S.MobileCartAction>
          <button
            type="button"
            disabled={!cartCount || !canContinue || loading}
            onClick={continueFlow}
          >
            Continuar
          </button>
        </S.MobileCartAction>
      </S.CartLayer>
    );
  }

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
            <h1>{step === 'address' ? 'Endereço de entrega' : 'Pagamento'}</h1>
            <p>
              {step === 'address'
                ? 'Confirme como deseja receber o pedido.'
                : 'Escolha uma forma de pagamento disponível.'}
            </p>
          </div>
        </S.Heading>

        <S.TwoColumns>
          <S.Panel>
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
            {quote ? (
              <div className="row">
                <span>Taxa de Entrega</span>
                <strong>{quote.deliveryFeeAmount > 0 ? currency(quote.deliveryFeeAmount) : 'Grátis'}</strong>
              </div>
            ) : null}
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
