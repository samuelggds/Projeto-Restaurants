import { useEffect, useRef } from 'react';
import { ChevronLeft, TicketPercent, X } from 'lucide-react';
import styled from 'styled-components';
import type { PublicPromotionalCoupon } from '../types';
import { HomePromotionalCoupons } from './HomePromotionalCoupons';

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

const Screen = styled.section`
  position: fixed;
  inset: 0;
  z-index: 94;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: #f7f8fa;
  color: #202631;

  .coupon-screen-inner {
    width: min(760px, calc(100% - 32px));
    margin: 0 auto;
    padding: 24px 0 80px;
  }

  .coupon-screen-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .coupon-screen-top button {
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: #b34824;
    min-height: 42px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    font-size: 13px;
    font-weight: 700;
  }

  .coupon-screen-top button svg { width: 18px; height: 18px; }
  .coupon-screen-top button:focus-visible,
  .wallet-link:focus-visible { outline: 2px solid #c94f30; outline-offset: 2px; }

  .coupon-screen-hero {
    margin-top: 14px;
    padding: 24px 22px;
    background: #fff;
    border: 1px solid #e8e8ed;
    border-radius: 18px;
  }

  .coupon-screen-symbol {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    color: #c95a27;
    border-radius: 14px;
    background: #fff0e6;
    margin-bottom: 12px;
  }
  .coupon-screen-symbol svg { width: 23px; height: 23px; }
  h1 { margin: 0; font-size: clamp(23px, 4vw, 30px); line-height: 1.16; letter-spacing: -.045em; }
  .coupon-screen-hero p { margin: 9px 0 0; color: #637080; line-height: 1.5; font-size: 14px; }

  .coupon-screen-note {
    margin: 16px 0;
    padding: 14px;
    border: 1px solid #e6e8ef;
    border-radius: 12px;
    background: #fff;
    color: #627087;
    line-height: 1.5;
    font-size: 12px;
  }

  .wallet-link {
    margin-top: 10px;
    padding: 9px 13px;
    border: 1px solid #e8b8a3;
    border-radius: 9px;
    background: #fff7f2;
    color: #a84622;
    font-size: 13px;
    font-weight: 750;
  }

  @media (max-width: 760px) {
    bottom: 56px;
    .coupon-screen-inner { padding: 12px 0 32px; }
    .coupon-screen-hero { margin-top: 6px; padding: 20px 16px; }
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
      <X aria-hidden="true" />
    </button>
  </Notice>;
}

export function HomeCouponsCenter({
  coupons, loggedIn, onClose, onApply, onOpenWallet,
}: {
  coupons: PublicPromotionalCoupon[];
  loggedIn: boolean;
  onClose: () => void;
  onApply?: (code: string) => void;
  onOpenWallet?: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return <Screen role="region" aria-label="Tela de cupons">
    <div className="coupon-screen-inner">
      <div className="coupon-screen-top">
        <button type="button" onClick={onClose}><ChevronLeft aria-hidden="true" /> Voltar ao cardápio</button>
        <button type="button" aria-label="Fechar tela de cupons" onClick={onClose}><X aria-hidden="true" /></button>
      </div>
      <div className="coupon-screen-hero">
        <span className="coupon-screen-symbol"><TicketPercent aria-hidden="true" /></span>
        <h1 tabIndex={-1} ref={titleRef}>Cupons do restaurante</h1>
        <p>{coupons.length === 0
          ? 'Nenhum cupom público disponível neste momento.'
          : `${coupons.length} ${coupons.length === 1 ? 'cupom disponível' : 'cupons disponíveis'} para você conhecer e aproveitar.`}</p>
      </div>
      <HomePromotionalCoupons coupons={coupons} onApply={onApply} pageView />
      <div className="coupon-screen-note">
        {loggedIn
          ? 'Os descontos são validados ao finalizar o pedido, de acordo com as regras de cada campanha.'
          : 'Você pode consultar e copiar cupons públicos como visitante. Cupons exclusivos e recompensas exigem uma conta de cliente.'}
        {loggedIn && onOpenWallet && <div>
          <button type="button" className="wallet-link" onClick={onOpenWallet}>Ver minha carteira de cupons e recompensas</button>
        </div>}
      </div>
    </div>
  </Screen>;
}
