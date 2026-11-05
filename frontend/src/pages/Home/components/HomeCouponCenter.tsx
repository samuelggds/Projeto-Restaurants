import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, CircleCheck, Copy, Home, List, TicketPercent, Truck, UserRound, ChevronDown, Gift, Pizza } from 'lucide-react';
import styled from 'styled-components';
import type { PublicPromotionalCoupon } from '../types';
import { CouponScreen } from './HomeCouponScreen.styles';

const Notice = styled.aside`
  position: sticky;
  top: 0;
  z-index: 32;
  width: 100%;
  margin: 0;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: stretch;
  border-radius: 0;
  background: #19ba59;
  color: white;
  overflow: hidden;

  button {
    min-height: 44px;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
  }

  .notice-open {
    grid-column: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
    padding: 10px 14px;
    text-align: center;
    font-size: 13px;
    font-weight: 800;
  }

  .notice-open svg {
    width: 19px;
    height: 19px;
    flex-shrink: 0;
    animation: coupon-ticket-bob 1900ms ease-in-out infinite;
    transform-origin: center;
  }
  @keyframes coupon-ticket-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .notice-open svg { animation: none; }
  }
  .notice-dismiss { grid-column: 3; display: grid; place-items: center; }
  .notice-dismiss svg { width: 18px; height: 18px; }
  button:hover { background: #ffffff1a; }
  button:focus-visible { outline: 2px solid white; outline-offset: -4px; }

  @media (max-width: 760px) {
    .notice-open { font-size: 12px; }
  }
`;


export function HomeCouponNotice({ count, onOpen, onDismiss }: {
  count: number;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  if (count <= 0) return null;
  const label = count === 1 ? 'Você tem 1 cupom! Aproveite!' : `Você tem ${count} cupons! Aproveite!`;
  return <Notice aria-label="Aviso de cupons">
    <button type="button" className="notice-open" aria-label={`${label} Abrir cupons`} onClick={onOpen}>
      <TicketPercent aria-hidden="true" />
      <span>{label}</span>
    </button>
    <button type="button" className="notice-dismiss" aria-label="Fechar aviso de cupons" onClick={onDismiss}>
      <span aria-hidden="true">×</span>
    </button>
  </Notice>;
}


const currency = (amount: number) => amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const normalizedCode = (code: string) => code.replace(/\s+/gu, '').toLocaleUpperCase('pt-BR');

export function HomeCouponsCenter({
  coupons, loggedIn, onClose, onSelect, onRemove, onOpenCart,
  onOpenOrders, onOpenProfile, onOpenWallet, brandName = 'Restaurante',
  selectedCode = '', selectedConfirmed = false, selectedPending = false,
  quoteError = null, quoteSubtotal = 0, hasCartItems = false, orderType = 'delivery',
  darkMode = false,
}: {
  coupons: PublicPromotionalCoupon[];
  loggedIn: boolean;
  onClose: () => void;
  onSelect?: (code: string) => void;
  onRemove?: () => void;
  onOpenCart?: () => void;
  onOpenOrders?: () => void;
  onOpenProfile?: () => void;
  onOpenWallet?: () => void;
  brandName?: string;
  selectedCode?: string;
  selectedConfirmed?: boolean;
  selectedPending?: boolean;
  quoteError?: string | null;
  quoteSubtotal?: number;
  hasCartItems?: boolean;
  orderType?: 'delivery' | 'pickup';
  darkMode?: boolean;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const activeRef = useRef(true);
  const [typedCode, setTypedCode] = useState('');
  const [feedback, setFeedback] = useState('');
  const [copiedCode, setCopiedCode] = useState('');
  const activeCode = normalizedCode(selectedCode);
  const activeCoupon = coupons.find(coupon => normalizedCode(coupon.code) === activeCode);
  const isShippingCoupon = activeCoupon?.discountType === 'FREE_SHIPPING';
  const insufficientSubtotal = activeCoupon && Number(activeCoupon.minimumSubtotal) > quoteSubtotal;

  useEffect(() => {
    activeRef.current = true;
    titleRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      activeRef.current = false;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const selectCoupon = (coupon: PublicPromotionalCoupon) => {
    if (coupon.discountType === 'FREE_SHIPPING' && orderType !== 'delivery') {
      setFeedback('Este cupom é exclusivo para Delivery. Selecione Entrega para utilizá-lo.');
      return;
    }
    if (coupon.audience && coupon.audience !== 'ALL' && !loggedIn) {
      setFeedback('Esta oferta exige uma conta de cliente. Entre para conferir sua elegibilidade.');
      return;
    }
    setFeedback('');
    onSelect?.(coupon.code);
  };

  const useTypedCode = () => {
    const code = normalizedCode(typedCode);
    if (!code) { setFeedback('Digite um código para consultar.'); return; }
    const match = coupons.find(coupon => normalizedCode(coupon.code) === code);
    if (!match) {
      setFeedback('Código não encontrado entre os cupons disponíveis deste restaurante.');
      return;
    }
    selectCoupon(match);
    setTypedCode('');
  };

  const copyCode = async (code: string) => {
    const normalized = normalizedCode(code);
    setCopiedCode('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(normalized);
      if (activeRef.current) { setCopiedCode(normalized); setFeedback('Código copiado.'); }
    } catch {
      if (activeRef.current) setFeedback('Não foi possível copiar automaticamente. Selecione o código do cartão e copie manualmente.');
    }
  };

  const rulesFor = (coupon: PublicPromotionalCoupon) => {
    const rules: string[] = [];
    if (coupon.discountType === 'FREE_SHIPPING') rules.push('Válido somente para Delivery em endereço atendido.');
    else {
      const options = [
        coupon.allowDelivery ? 'Delivery' : '',
        coupon.allowPickup ? 'Retirada' : '',
        coupon.allowTable ? 'Mesa' : '',
      ].filter(Boolean);
      if (options.length) rules.push('Modalidades permitidas: ' + options.join(', ') + '.');
    }
    if (coupon.minimumSubtotal > 0) rules.push('Pedido mínimo: ' + currency(coupon.minimumSubtotal) + '.');
    if (coupon.audience === 'NEW_CUSTOMERS') rules.push('Exclusivo para clientes em primeira compra.');
    if (coupon.audience === 'RETURNING_CUSTOMERS') rules.push('Exclusivo para clientes que já compraram.');
    if (coupon.description.trim()) rules.push(coupon.description.trim());
    rules.push('Não acumula com outros cupons. Benefício e elegibilidade confirmados no checkout.');
    return rules;
  };

  const benefitTitle = (coupon: PublicPromotionalCoupon) => coupon.discountType === 'FREE_SHIPPING'
    ? 'Frete grátis'
    : coupon.discountType === 'PERCENTAGE'
      ? coupon.discount + '% de desconto'
      : currency(coupon.discount) + ' de desconto';
  const subtitle = (coupon: PublicPromotionalCoupon) => {
    const minimum = coupon.minimumSubtotal > 0 ? ' · mínimo ' + currency(coupon.minimumSubtotal) : '';
    if (coupon.discountType === 'FREE_SHIPPING') return 'Delivery' + minimum;
    return (coupon.description || coupon.title || 'Cupom promocional') + minimum;
  };

  const selectedMessage = !hasCartItems
    ? 'Escolha produtos para conferir as regras e o desconto no pedido.'
    : insufficientSubtotal
      ? 'Faltam ' + currency(Math.max(0, Number(activeCoupon!.minimumSubtotal) - quoteSubtotal)) + ' para atingir o mínimo desta oferta.'
      : isShippingCoupon && orderType === 'pickup'
        ? 'Frete grátis só é válido para Delivery.'
        : selectedPending
          ? 'Aguardando validação do desconto pelo servidor.'
          : quoteError
            ? quoteError
            : selectedConfirmed
              ? 'Benefício validado no pedido atual. O valor será conferido novamente antes da compra.'
              : 'Cupom selecionado. Confira as condições no carrinho e finalize somente após a validação.';

  return <CouponScreen className={darkMode ? 'is-dark' : undefined} aria-label="Tela de cupons" role="region">
    <div className="cp-inner">
      <main className="cp-content">
        <div className="cp-top"><button type="button" className="cp-back" onClick={onClose}><ArrowLeft aria-hidden="true" /> Voltar ao cardápio</button></div>
        <div className="cp-heading"><h1 tabIndex={-1} ref={titleRef}>Cupons da {brandName}</h1><p>Escolha um benefício para o seu próximo pedido.</p></div>
        <div className="cp-manual">
          <label htmlFor="home-coupon-manual">Tem um código?</label>
          <div className="cp-manual-row">
            <input id="home-coupon-manual" value={typedCode} onChange={event => setTypedCode(event.target.value)}
              type="text" maxLength={40} autoCapitalize="characters" autoComplete="off" placeholder="Digite o código"
              onKeyDown={event => { if (event.key === 'Enter') useTypedCode(); }} />
            <button type="button" onClick={useTypedCode}>Adicionar</button>
          </div>
        </div>
        <p className="cp-list-label">{coupons.length} {coupons.length === 1 ? 'cupom disponível' : 'cupons disponíveis'}</p>
        <div className="cp-list" aria-label="Cupons disponíveis">
          {coupons.map(coupon => {
            const code = normalizedCode(coupon.code);
            const selected = Boolean(code && activeCode === code);
            const shipping = coupon.discountType === 'FREE_SHIPPING';
            return <article key={coupon.id} className="cp-ticket">
              <div className="cp-ticket-main">
                <span className={'cp-icon' + (shipping ? ' cp-shipping' : '')}>
                  {shipping ? <Truck aria-hidden="true"/> : coupon.discountType === 'PERCENTAGE' ? <Pizza aria-hidden="true" /> : <Gift aria-hidden="true" />}
                </span>
                <div className="cp-ticket-copy"><h2>{benefitTitle(coupon)}</h2><p>{subtitle(coupon)}</p></div>
                <button type="button" className={'cp-use' + (selected ? ' is-selected' : '')}
                  aria-label={(selected ? 'Cupom selecionado: ' : 'Usar cupom ') + code}
                  aria-pressed={selected} onClick={() => selectCoupon(coupon)}>{selected ? 'Selecionado' : 'Usar'}</button>
              </div>
              <div className="cp-ticket-footer">
                <div className="cp-code-row"><strong>{code}</strong><button className="cp-copy" type="button"
                  title={copiedCode === code ? 'Copiado' : 'Copiar código'} aria-label={'Copiar código ' + code}
                  onClick={() => void copyCode(code)}>{copiedCode === code ? <Check aria-hidden="true"/> : <Copy aria-hidden="true"/>}</button></div>
                <details className="cp-rules"><summary>Regras <ChevronDown aria-hidden="true"/></summary>
                  <ul>{rulesFor(coupon).map((rule,index) => <li key={index}>{rule}</li>)}</ul>
                </details>
              </div>
            </article>;
          })}
        </div>
        {feedback && <p className="cp-status" role="status" aria-live="polite">{feedback}</p>}
        {activeCoupon && <section className="cp-selected" aria-label="Cupom selecionado">
          <div className="cp-selected-heading"><CircleCheck aria-hidden="true"/><strong>{activeCode} selecionado</strong></div>
          <p>{selectedMessage}</p>
          <div className="cp-selected-actions">
            <button type="button" onClick={() => { onOpenCart?.(); onClose(); }}>Ver meu pedido</button>
            <button type="button" onClick={onClose}>Escolher produtos</button>
            <button type="button" onClick={() => { onRemove?.(); setFeedback('Cupom removido da seleção.'); }}>Remover</button>
          </div>
        </section>}
        <aside className="cp-guest-note"><UserRound aria-hidden="true"/><p>Cupons públicos podem ser consultados sem entrar. Ofertas exclusivas e recompensas dependem da sua conta.</p></aside>
        {loggedIn && onOpenWallet && <button type="button" className="cp-wallet" onClick={onOpenWallet}>Ver meus cupons e recompensas</button>}
        <div className="cp-divider" />
      </main>
      <nav className="cp-bottom-nav" aria-label="Navegação de cupons">
        <button type="button" onClick={onClose}><Home aria-hidden="true"/>Início</button>
        <button type="button" onClick={onOpenOrders || onClose}><List aria-hidden="true"/>Pedidos</button>
        <button type="button" aria-current="page"><TicketPercent aria-hidden="true"/>Cupons</button>
        <button type="button" onClick={onOpenProfile || onClose}><UserRound aria-hidden="true"/>Conta</button>
      </nav>
      <footer className="cp-footer">Tecnologia <strong>GastroNexa</strong></footer>
    </div>
  </CouponScreen>;
}
