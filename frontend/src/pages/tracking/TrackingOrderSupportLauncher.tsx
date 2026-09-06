import { useState } from 'react';
import { Headphones, MessageCircle } from 'lucide-react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/authContext';
import { getGuestOrderOwnershipToken } from '../../Services/ordersService';
import { OrderSupportDialog } from '../../features/order-support/OrderSupportDialog';

export function TrackingOrderSupportLauncher({ orderId }: { orderId: number }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const guestProof = getGuestOrderOwnershipToken(orderId);
  const isCustomer = String(user?.role || '').toUpperCase() === 'CLIENTE';
  const visitor = !isCustomer && Boolean(guestProof);

  if (!isCustomer && !guestProof) return null;

  return (
    <>
      <Launcher type="button" onClick={() => setOpen(true)} aria-label={`Pedir ajuda sobre o pedido ${orderId}`}>
        <span><Headphones /></span>
        <span className="copy">
          <b>Precisa de ajuda?</b>
          <small>Pedido #{orderId}</small>
        </span>
        <MessageCircle className="arrow" />
      </Launcher>
      <OrderSupportDialog
        open={open}
        onClose={() => setOpen(false)}
        orders={[{ id: orderId, summary: 'Atendimento do pedido' }]}
        initialOrderId={orderId}
        visitor={visitor}
      />
    </>
  );
}

const Launcher = styled.button`
  position: fixed;
  left: 18px;
  bottom: 20px;
  z-index: 1220;
  min-height: 54px;
  max-width: min(290px, calc(100vw - 36px));
  padding: 8px 12px 8px 8px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 22px;
  gap: 9px;
  align-items: center;
  border: 1px solid #e4d3cd;
  border-radius: 16px;
  background: rgba(255,255,255,.98);
  color: #1f2937;
  box-shadow: 0 14px 38px rgba(15,23,42,.16);
  text-align: left;
  cursor: pointer;
  backdrop-filter: blur(8px);
  > span:first-child { width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:#fff0ea;color:#d65632; }
  > span:first-child svg { width:19px; }
  .copy { min-width:0; }
  b, small { display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  b { font-size:11px; }
  small { margin-top:2px; color:#7b8798; font-size:9px; }
  .arrow { width:17px; color:#d65632; }
  &:hover { border-color:#dfa48f; transform:translateY(-1px); }
  &:focus-visible { outline:3px solid rgba(214,86,50,.2); outline-offset:2px; }
  @media (max-width: 480px) {
    left: 12px;
    bottom: max(12px, env(safe-area-inset-bottom));
    min-height: 48px;
    max-width: calc(100vw - 24px);
    grid-template-columns: 34px minmax(0,1fr) 20px;
    > span:first-child { width:34px;height:34px; }
  }
`;
