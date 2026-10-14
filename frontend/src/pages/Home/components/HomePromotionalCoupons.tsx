import { useEffect, useState } from 'react';
import { Check, Copy, TicketPercent, X } from 'lucide-react';
import type { PublicPromotionalCoupon } from '../types';
import * as S from './HomePromotionalCoupons.styles';

export function HomePromotionalCoupons({ coupons, onApply }: {
  coupons: PublicPromotionalCoupon[];
  onApply?: (code: string) => void;
}) {
  const [allOpen, setAllOpen] = useState(false);
  const [copied, setCopied] = useState('');
  useEffect(() => {
    if (!allOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setAllOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [allOpen]);
  async function copy(code: string) {
    try { await navigator.clipboard.writeText(code); setCopied(code); }
    catch { setCopied(''); }
  }
  const cards = (items: PublicPromotionalCoupon[]) => items.map((coupon) => (
    <article className="coupon-card" key={coupon.id}>
      <div className="coupon-symbol"><TicketPercent aria-hidden="true" /></div>
      <div className="coupon-content">
        <b>{coupon.title}</b>
        <strong>{coupon.discountType === 'FREE_SHIPPING' ? 'FRETE GRÁTIS' : coupon.discountType === 'PERCENTAGE' ? `${coupon.discount}% OFF` : coupon.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + ' OFF'}</strong>
        {coupon.audience === 'NEW_CUSTOMERS' && <small>Exclusivo para primeira compra com login</small>}
        {coupon.audience === 'RETURNING_CUSTOMERS' && <small>Exclusivo para clientes que já compraram</small>}
        {coupon.description && <p>{coupon.description}</p>}
        {coupon.minimumSubtotal > 0 && <small>Pedido mínimo: {coupon.minimumSubtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</small>}
        <div className="coupon-actions">
          <button type="button" className="coupon-copy" onClick={() => void copy(coupon.code)}>
            {copied === coupon.code ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {coupon.code}
          </button>
          <button type="button" className="coupon-apply" onClick={() => { onApply?.(coupon.code); setAllOpen(false); }}>Usar cupom</button>
        </div>
      </div>
    </article>
  ));
  return (
    <S.Section aria-label="Cupons promocionais disponíveis">
      <header><span><TicketPercent aria-hidden="true" /><b>Cupons especiais</b></span>
        {coupons.length > 2 && <button type="button" onClick={() => setAllOpen(true)}>Ver todos</button>}
      </header>
      <div className="coupon-list">{cards(coupons.slice(0, 2))}</div>
      {allOpen && <div className="coupon-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAllOpen(false); }}>
        <div className="coupon-dialog" role="dialog" aria-modal="true" aria-label="Todos os cupons promocionais">
          <header><b>Todos os cupons disponíveis</b><button type="button" aria-label="Fechar cupons" onClick={() => setAllOpen(false)}><X /></button></header>
          <div className="coupon-list">{cards(coupons)}</div>
        </div>
      </div>}
    </S.Section>
  );
}
