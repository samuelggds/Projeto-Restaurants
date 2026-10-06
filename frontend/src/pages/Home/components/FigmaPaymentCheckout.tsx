import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CartItem } from '../hooks/useCart';
import * as S from './FigmaPaymentCheckout.styles';

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Props = {
  primaryColor: string;
  loggedIn: boolean;
  brandName: string;
  logoUrl?: string;
  cart: CartItem[];
  cartCount: number;
  subtotal: number;
  couponDiscount: number;
  couponLabel?: string;
  deliveryFee: number;
  total: number;
  paymentMethods: ReactNode;
  onBack: () => void;
  onContinue: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function FigmaPaymentCheckout({
  primaryColor,
  loggedIn,
  brandName,
  logoUrl,
  cart,
  cartCount,
  subtotal,
  couponDiscount,
  couponLabel,
  deliveryFee,
  total,
  paymentMethods,
  onBack,
  onContinue,
  disabled = false,
  loading = false,
}: Props) {
  return (
    <S.Page $primary={primaryColor} role="dialog" aria-modal="true" aria-label="Finalizar pedido">
      <S.MobileHeader>
        <button type="button" onClick={onBack} aria-label="Voltar">
          <ArrowLeft aria-hidden="true" />
        </button>
        <h1>Pagamento</h1>
      </S.MobileHeader>

      {loggedIn ? (
        <S.LoggedDesktopHeader>
          <div className="brand">
            <span>
              {logoUrl ? <img src={logoUrl} alt="" /> : brandName.trim().slice(0, 1).toUpperCase() || 'R'}
            </span>
            <b>{brandName.trim() || 'Restaurante'}</b>
          </div>
          <nav aria-label="Navegação do cliente">
            <span>Cardápio</span>
            <span>Cupons</span>
            <span>Suporte</span>
            <b>Minha Conta</b>
          </nav>
        </S.LoggedDesktopHeader>
      ) : null}

      <S.Content $loggedIn={loggedIn}>
        <S.MethodColumn>
          <h1>Forma de Pagamento</h1>
          <h2>Método de pagamento</h2>
          {paymentMethods}

          <S.MobileRecap>
            <h3>Resumo do pedido</h3>
            <div><span>Itens ({cartCount})</span><strong>{money(subtotal)}</strong></div>
            {couponDiscount > 0 ? (
              <div><span>{couponLabel || 'Cupom'}</span><strong>− {money(couponDiscount)}</strong></div>
            ) : null}
            <div><span>Taxa de entrega</span><strong>{deliveryFee > 0 ? money(deliveryFee) : 'Grátis'}</strong></div>
          </S.MobileRecap>
        </S.MethodColumn>

        <S.SummaryCard>
          <h2>Resumo do Pedido</h2>

          <div className="items">
            {cart.slice(0, 4).map((item) => (
              <div key={item.cartId || item.productId}>
                <span>{item.quantity}x {item.name}</span>
                <strong>{money(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>

          <div className="divider" />
          <div className="row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          {couponDiscount > 0 ? (
            <div className="row discount"><span>{couponLabel || 'Cupom'}</span><strong>− {money(couponDiscount)}</strong></div>
          ) : null}
          <div className="row"><span>Taxa de Entrega</span><strong className={deliveryFee <= 0 ? 'free' : ''}>{deliveryFee > 0 ? money(deliveryFee) : 'Grátis'}</strong></div>
          <div className="total"><span>Total</span><strong>{money(total)}</strong></div>

          <button
            type="button"
            disabled={disabled || loading}
            aria-busy={loading}
            data-loading={loading ? 'true' : undefined}
            onClick={onContinue}
          >
            <span className="checkout-button-label">
              {loading ? 'Processando pagamento...' : loggedIn ? 'Finalizar Pedido' : 'Continuar'}
            </span>
          </button>
        </S.SummaryCard>
      </S.Content>

      <S.DesktopFooter>
        <div className="top">
          <section>
            <div className="footer-brand"><span>{logoUrl ? <img src={logoUrl} alt="" /> : brandName.slice(0, 1).toUpperCase()}</span><b>{brandName}</b></div>
            <p>Sua experiência gourmet completa, direto do conforto de sua casa. O melhor do {brandName} entregue rápido.</p>
          </section>
          <section><b>Nossos Links</b><span>Cardápio</span><span>Cupons Ativos</span><span>Perguntas Frequentes</span></section>
          <section><b>Suporte</b><span>Falar no Chat</span><span>Central de Ajuda</span><a href="/termos/">Termos de Serviço</a></section>
          <section><b>Sua Loja Segura</b><p>GastroNexa é multi-tenant. Cada restaurante é operado diretamente por seu administrador autorizado.</p></section>
        </div>
        <div className="bottom"><span>© {new Date().getFullYear()} {brandName}. Todos os direitos reservados.</span><span className="legal-links"><a href="/privacidade/">Privacidade</a><span aria-hidden="true">·</span><a href="/cookies/">Cookies</a></span></div>
      </S.DesktopFooter>

      <S.MobileAction>
        <button
          type="button"
          disabled={disabled || loading}
          aria-busy={loading}
          data-loading={loading ? 'true' : undefined}
          onClick={onContinue}
        >
          <span className="checkout-button-label">
            {loading ? 'Processando pagamento...' : loggedIn ? 'Confirmar Pagamento' : 'Continuar'}
          </span>
        </button>
      </S.MobileAction>
    </S.Page>
  );
}
