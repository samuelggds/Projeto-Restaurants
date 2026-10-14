import { Check, Gift, Tag, TicketPercent, Truck } from 'lucide-react';
import styled from 'styled-components';
import type { PublicPromotionalCoupon } from '../types';

const Wrapper = styled.section`
  width: 100%;
  min-width: 0;
  display: grid;
  gap: 9px;
  padding: 12px;
  border: 1px solid #f1e9e5;
  border-radius: 14px;
  background: #faf9f8;

  .picker-heading {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0;
    color: #292522;
    font-size: 13px;
    font-weight: 800;
  }
  .picker-heading svg {
    width: 15px;
    height: 15px;
    color: #cd5746;
  }
  .picker-options {
    display: grid;
    gap: 7px;
  }
  .picker-option {
    --picker-ink: #aa6230;
    --picker-bg: #fffcf5;
    --picker-border: #eed8b7;
    appearance: none;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 27px minmax(0, 1fr) auto;
    align-items: center;
    width: 100%;
    min-width: 0;
    min-height: 61px;
    gap: 8px;
    border: 1px dashed var(--picker-border);
    border-radius: 11px;
    padding: 9px 10px;
    background: var(--picker-bg);
    color: #332d2a;
    text-align: left;
    cursor: pointer;
  }
  .picker-option--welcome {
    --picker-ink: #ba5143;
    --picker-bg: #fff3f0;
    --picker-border: #eac6bf;
  }
  .picker-option--shipping {
    --picker-ink: #147858;
    --picker-bg: #effaf4;
    --picker-border: #aedcc4;
  }
  .picker-option--returning {
    --picker-ink: #6954a6;
    --picker-bg: #f4f1fe;
    --picker-border: #d5cbee;
  }
  .picker-option--selected {
    border-style: solid;
    border-color: var(--picker-ink);
    box-shadow: 0 0 0 1px var(--picker-ink);
  }
  .picker-icon {
    display: grid;
    place-items: center;
    width: 27px;
    height: 27px;
    border-radius: 8px;
    background: #ffffffa6;
    color: var(--picker-ink);
  }
  .picker-icon svg {
    width: 15px;
    height: 15px;
  }
  .picker-copy {
    display: grid;
    min-width: 0;
    gap: 3px;
  }
  .picker-copy b {
    color: var(--picker-ink);
    font-size: 11px;
    overflow-wrap: anywhere;
  }
  .picker-copy small {
    color: #615955;
    font-size: 10px;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }
  .picker-status {
    font-size: 10px;
    font-weight: 800;
    color: var(--picker-ink);
    white-space: nowrap;
  }
  .picker-option:focus-visible {
    outline: 2px solid #242424;
    outline-offset: 2px;
  }
  @media (max-width: 760px) {
    padding: 10px;
    gap: 8px;
    .picker-option { min-height: 53px; padding: 7px 8px; gap: 7px; }
    .picker-copy b { font-size: 10px; }
    .picker-copy small { font-size: 9px; }
    .picker-status { font-size: 9px; }
  }
`;

function offerKind(coupon: PublicPromotionalCoupon) {
  if (coupon.discountType === 'FREE_SHIPPING') return 'shipping';
  if (coupon.audience === 'NEW_CUSTOMERS') return 'welcome';
  if (coupon.audience === 'RETURNING_CUSTOMERS') return 'returning';
  return 'promo';
}

function offerLabel(coupon: PublicPromotionalCoupon) {
  if (coupon.discountType === 'FREE_SHIPPING') return 'Frete grátis';
  if (coupon.discountType === 'PERCENTAGE') return coupon.discount + '% OFF';
  return coupon.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + ' OFF';
}

export function CheckoutPromotionalCouponPicker({
  coupons,
  appliedCode,
  onApply,
}: {
  coupons: PublicPromotionalCoupon[];
  appliedCode?: string | null;
  onApply: (code: string) => void;
}) {
  return (
    <Wrapper aria-label="Cupons promocionais">
      <h3 className="picker-heading"><TicketPercent aria-hidden="true" />Cupons promocionais</h3>
      <div className="picker-options">
        {coupons.map((coupon) => {
          const selected = coupon.code === appliedCode;
          const tone = offerKind(coupon);
          return (
            <button
              key={coupon.id}
              type="button"
              className={'picker-option picker-option--' + tone + (selected ? ' picker-option--selected' : '')}
              aria-label={'Aplicar cupom ' + coupon.code}
              aria-pressed={selected}
              onClick={() => onApply(coupon.code)}
            >
              <span className="picker-icon">
                {selected ? <Check aria-hidden="true" /> :
                  tone === 'shipping' ? <Truck aria-hidden="true" /> :
                  tone === 'welcome' || tone === 'returning' ? <Gift aria-hidden="true" /> :
                  <Tag aria-hidden="true" />}
              </span>
              <span className="picker-copy">
                <b>{coupon.code}</b>
                <small>{coupon.title} · {offerLabel(coupon)}</small>
              </span>
              <span className="picker-status">{selected ? 'Aplicado' : 'Usar'}</span>
            </button>
          );
        })}
      </div>
    </Wrapper>
  );
}
