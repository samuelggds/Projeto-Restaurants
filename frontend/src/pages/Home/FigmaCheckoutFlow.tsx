import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ShoppingBag, Ticket, UserRound } from 'lucide-react';
import { CartItemsList } from './components/CartItemsList';
import { CartCrossSell } from './components/CartCrossSell';
import type { CartItem } from './hooks/useCart';
import type { HomeProduct } from './types';
import type { OrderQuote } from './hooks/useOrderQuote';
import * as S from './FigmaCheckoutFlow.styles';

export type FigmaCheckoutStep = 'cart' | 'address' | 'payment';

type Props = {
  primaryColor: string;
  brandName: string;
  logoUrl?: string;
  isOpen?: boolean;
  deliveryTime?: string;
  userName?: string;
  step: FigmaCheckoutStep;
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  quote?: OrderQuote | null;
  loading?: boolean;
  canContinue?: boolean;
  couponContent?: ReactNode;
  onApplyCouponCode?: (code: string) => void;
  guestAddressScreen?: ReactNode;
  authenticatedAddressScreen?: ReactNode;
  authenticatedEmptyAddressScreen?: ReactNode;
  paymentScreen?: ReactNode;
  recommendations?: HomeProduct[];
  onAddRecommendation?: (product: HomeProduct, sourceElement?: HTMLElement | null) => void;
  onStepChange: (step: FigmaCheckoutStep) => void;
  onIncrease: (cartId: string) => void;
  onDecrease: (cartId: string) => void;
  onRemove?: (cartId: string) => void;
  onClear: () => void;
  onClose: () => void;
  onLogin: () => void;
  onSubmit: () => void;
};

const currency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type CouponEntryProps = {
  appliedCode?: string | null;
  placeholder: string;
  onOpen: () => void;
  onApply?: (code: string) => void;
};

function CouponEntry({
  appliedCode,
  placeholder,
  onOpen,
  onApply,
}: CouponEntryProps) {
  const [draft, setDraft] = useState(() => String(appliedCode || ''));
  const normalizedDraft = draft.trim().toUpperCase();
  const normalizedApplied = String(appliedCode || '').trim().toUpperCase();
  const isApplied = Boolean(normalizedApplied && normalizedDraft === normalizedApplied);

  const apply = () => {
    onOpen();
    if (!normalizedDraft || isApplied) return;
    onApply?.(normalizedDraft);
  };

  return (
    <div className="coupon-entry">
      <Ticket aria-hidden="true" />
      <input
        type="text"
        value={draft}
        placeholder={placeholder}
        aria-label="Código do cupom"
        autoComplete="off"
        onFocus={onOpen}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          apply();
        }}
      />
      <button type="button" onClick={apply}>
        {isApplied ? 'Aplicado' : 'Aplicar'}
      </button>
    </div>
  );
}

export function FigmaCheckoutFlow({
  primaryColor,
  brandName,
  logoUrl,
  isOpen = true,
  userName,
  step,
  cart,
  cartCount,
  cartTotal,
  quote,
  loading = false,
  canContinue = true,
  couponContent,
  onApplyCouponCode,
  guestAddressScreen,
  authenticatedAddressScreen,
  authenticatedEmptyAddressScreen,
  paymentScreen,
  recommendations = [],
  onAddRecommendation,
  onStepChange,
  onIncrease,
  onDecrease,
  onRemove,
  onClear,
  onClose,
  onLogin,
  onSubmit,
}: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [couponOpen, setCouponOpen] = useState(false);
  const [mobileCart, setMobileCart] = useState(() =>
    window.matchMedia('(max-width: 760px)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const syncMobileCart = () => setMobileCart(media.matches);
    syncMobileCart();
    media.addEventListener('change', syncMobileCart);
    return () => media.removeEventListener('change', syncMobileCart);
  }, []);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    layerRef.current?.focus();

    return () => {
      previouslyFocused?.focus();
    };
  }, []);

  const firstName = String(userName || '').trim().split(/\s+/)[0];
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

  if (step === 'address') {
    if (guestAddressScreen) return <>{guestAddressScreen}</>;
    if (authenticatedEmptyAddressScreen) return <>{authenticatedEmptyAddressScreen}</>;
    if (authenticatedAddressScreen) return <>{authenticatedAddressScreen}</>;
    return null;
  }

  if (step === 'payment') {
    return paymentScreen ? <>{paymentScreen}</> : null;
  }

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
        <S.CartDesktopHeader>
          <button className="brand" type="button" onClick={onClose} aria-label={brandName}>
            <span className="logo">
              {logoUrl ? <img src={logoUrl} alt="" /> : brandName.slice(0, 1)}
            </span>
            <span className="brand-copy">
              <b>{brandName}</b>
              <small>
                <i className={isOpen ? 'open' : ''} />
                {isOpen ? 'Aberto agora' : 'Fechado agora'}
              </small>
            </span>
          </button>

          <div className="actions">
            <button className="account" type="button" onClick={onLogin}>
              <UserRound aria-hidden="true" />
              <span>{firstName ? `Olá, ${firstName}` : 'Olá, Entrar'}</span>
            </button>
            <button className="cart" type="button" data-cart-fly-target>
              <ShoppingBag aria-hidden="true" />
              <span>Meu Carrinho</span>
              {cartCount > 0 ? <i>{cartCount}</i> : null}
            </button>
          </div>
        </S.CartDesktopHeader>

        <S.CartContent>
          <S.CartItemsColumn>
            <S.CartTitleRow>
              <div className="title-group">
                <button className="mobile-back" type="button" onClick={back} aria-label="Voltar">
                  <ArrowLeft aria-hidden="true" />
                </button>
                <h1 className="desktop-title">Seu Carrinho de Compras</h1>
                <h1 className="mobile-title">Meu pedido</h1>
              </div>
              {cartCount > 0 ? (
                <button className="mobile-clear-action" type="button" onClick={onClear}>
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

            {cartCount > 0 && !mobileCart && recommendations.length && onAddRecommendation ? (
              <CartCrossSell products={recommendations} onAdd={onAddRecommendation} />
            ) : null}

            {cartCount > 0 && mobileCart ? (
              <S.MobileCartSummary>
                <CouponEntry
                  key={quote?.couponCode || 'mobile-coupon-empty'}
                  appliedCode={quote?.couponCode}
                  placeholder="Cupom de desconto"
                  onOpen={() => setCouponOpen(true)}
                  onApply={onApplyCouponCode}
                />

                {couponOpen && couponContent ? (
                  <div className="coupon-details">{couponContent}</div>
                ) : null}

                {recommendations.length && onAddRecommendation ? (
                  <CartCrossSell products={recommendations} onAdd={onAddRecommendation} />
                ) : null}

                <div className="summary-row">
                  <span>Subtotal</span>
                  <strong>{currency(subtotal)}</strong>
                </div>
                {quote?.couponDiscount ? (
                  <div className="summary-row discount">
                    <span>Cupom{quote.couponCode ? ` · ${quote.couponCode}` : ''}</span>
                    <strong>− {currency(quote.couponDiscount)}</strong>
                  </div>
                ) : null}
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

          {cartCount > 0 && !mobileCart ? (
            <S.CartSummarySidebar>
              <h2>Resumo do Pedido</h2>

              <CouponEntry
                key={quote?.couponCode || 'desktop-coupon-empty'}
                appliedCode={quote?.couponCode}
                placeholder="Cupom de desconto..."
                onOpen={() => setCouponOpen(true)}
                onApply={onApplyCouponCode}
              />

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

              <button
                className="clear-cart"
                type="button"
                aria-label="Limpar todo o carrinho"
                onClick={onClear}
              >
                Limpar carrinho
              </button>
            </S.CartSummarySidebar>
          ) : null}
        </S.CartContent>

        <S.CartDesktopFooter>
          <div className="footer-main">
            <section className="platform">
              <div className="platform-brand">
                <span>{logoUrl ? <img src={logoUrl} alt="" /> : brandName.slice(0, 1).toUpperCase()}</span>
                <strong>{brandName}</strong>
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
              <a href="/termos/">Termos de Serviço</a>
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
            <span>© {new Date().getFullYear()} {brandName}. Todos os direitos reservados.</span>
            <span className="legal"><a href="/privacidade/">Privacidade</a><a href="/cookies/">Cookies</a></span>
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

  return null;
}
