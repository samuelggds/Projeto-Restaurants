import { useEffect, useState } from 'react';
import { Check, Copy, Gift, TicketPercent, Truck, X } from 'lucide-react';
import type { PublicPromotionalCoupon } from '../types';
import * as S from './HomePromotionalCoupons.styles';

type TicketTone = 'shipping' | 'welcome' | 'returning' | 'promo';

function ticketTone(coupon: PublicPromotionalCoupon): TicketTone {
  if (coupon.discountType === 'FREE_SHIPPING') return 'shipping';
  if (coupon.audience === 'NEW_CUSTOMERS') return 'welcome';
  if (coupon.audience === 'RETURNING_CUSTOMERS') return 'returning';
  return 'promo';
}

function ticketCategory(coupon: PublicPromotionalCoupon) {
  if (coupon.discountType === 'FREE_SHIPPING') return 'Entrega';
  if (coupon.audience === 'NEW_CUSTOMERS') return '1ª compra';
  if (coupon.audience === 'RETURNING_CUSTOMERS') return 'Clientes fiéis';
  return 'Promoção';
}

function ticketValue(coupon: PublicPromotionalCoupon) {
  if (coupon.discountType === 'FREE_SHIPPING') return 'FRETE GRÁTIS';
  if (coupon.discountType === 'PERCENTAGE') return coupon.discount + '% OFF';
  return coupon.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + ' OFF';
}

function ticketIcon(coupon: PublicPromotionalCoupon) {
  if (coupon.discountType === 'FREE_SHIPPING') return <Truck aria-hidden="true" />;
  if (coupon.audience === 'NEW_CUSTOMERS' || coupon.audience === 'RETURNING_CUSTOMERS')
    return <Gift aria-hidden="true" />;
  return <TicketPercent aria-hidden="true" />;
}

export function HomePromotionalCoupons({
  coupons,
  onApply,
}: {
  coupons: PublicPromotionalCoupon[];
  onApply?: (code: string) => void;
}) {
  const [allOpen, setAllOpen] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!allOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAllOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [allOpen]);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
    } catch {
      setCopied('');
    }
  }

  const cards = (items: PublicPromotionalCoupon[]) =>
    items.map((coupon) => (
      <article className={'coupon-card coupon-card--' + ticketTone(coupon)} key={coupon.id}>
        <div className="coupon-main">
          <span className="coupon-symbol">{ticketIcon(coupon)}</span>
          <div className="coupon-content">
            <div className="coupon-heading">
              <b title={coupon.title}>{coupon.title}</b>
              <span className="coupon-kind">{ticketCategory(coupon)}</span>
            </div>
            <strong>{ticketValue(coupon)}</strong>
            {coupon.audience === 'NEW_CUSTOMERS' && (
              <small className="coupon-audience">Exclusivo para primeira compra com login</small>
            )}
            {coupon.audience === 'RETURNING_CUSTOMERS' && (
              <small className="coupon-audience">Para quem já comprou neste restaurante</small>
            )}
            {coupon.description && <p title={coupon.description}>{coupon.description}</p>}
            {coupon.minimumSubtotal > 0 && (
              <small className="coupon-minimum">
                Pedido mín. {coupon.minimumSubtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </small>
            )}
          </div>
        </div>
        <div className="coupon-actions">
          <button
            type="button"
            className="coupon-copy"
            aria-label={'Copiar cupom ' + coupon.code}
            title={coupon.code}
            onClick={() => void copy(coupon.code)}
          >
            {copied === coupon.code ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span>{copied === coupon.code ? 'Copiado!' : coupon.code}</span>
          </button>
          <button
            type="button"
            className="coupon-apply"
            aria-label={'Usar cupom ' + coupon.code}
            onClick={() => {
              onApply?.(coupon.code);
              setAllOpen(false);
            }}
          >
            Usar
          </button>
        </div>
      </article>
    ));

  return (
    <S.Section aria-label="Cupons promocionais disponíveis">
      <header>
        <span><TicketPercent aria-hidden="true" /><b>Cupons especiais</b></span>
        {coupons.length > 2 && (
          <button type="button" onClick={() => setAllOpen(true)}>
            Ver todos
          </button>
        )}
      </header>
      <div
        className="coupon-list homepage-coupon-list"
        role="region"
        aria-roledescription="carrossel"
        aria-label="Cupons disponíveis, deslize horizontalmente para ver os próximos"
        tabIndex={coupons.length > 1 ? 0 : undefined}
      >
        {cards(coupons)}
      </div>
      {coupons.length > 1 && (
        <p className="coupon-swipe-hint" aria-hidden="true">Deslize para ver mais cupons →</p>
      )}
      {allOpen && (
        <div
          className="coupon-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAllOpen(false);
          }}
        >
          <div
            className="coupon-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Todos os cupons promocionais"
          >
            <header>
              <b>Todos os cupons disponíveis</b>
              <button type="button" aria-label="Fechar cupons" onClick={() => setAllOpen(false)}>
                <X aria-hidden="true" />
              </button>
            </header>
            <div className="coupon-list">{cards(coupons)}</div>
          </div>
        </div>
      )}
    </S.Section>
  );
}
