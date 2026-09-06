import { useState } from 'react';
import { Headphones, MessageCircle, ShieldCheck, Sparkles, UserPlus, X } from 'lucide-react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/authContext';
import { getGuestOrderOwnershipToken } from '../../Services/ordersService';
import { OrderSupportDialog } from '../../features/order-support/OrderSupportDialog';
import { buildAuthEntryUrlForLocation } from '../../shared/navigation/authNavigation';

export function TrackingOrderSupportLauncher({ orderId }: { orderId: number }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [accountNudgeOpen, setAccountNudgeOpen] = useState(() => {
    try {
      return window.sessionStorage.getItem(`guest-account-nudge:${orderId}`) !== 'dismissed';
    } catch {
      return true;
    }
  });
  const guestProof = getGuestOrderOwnershipToken(orderId);
  const isCustomer = String(user?.role || '').toUpperCase() === 'CLIENTE';
  const visitor = !isCustomer && Boolean(guestProof);

  if (!isCustomer && !guestProof) return null;

  const dismissNudge = () => {
    setAccountNudgeOpen(false);
    try {
      window.sessionStorage.setItem(`guest-account-nudge:${orderId}`, 'dismissed');
    } catch {
      // O aviso é apenas uma melhoria de UX; storage bloqueado não impede o pedido.
    }
  };

  return (
    <>
      {visitor && accountNudgeOpen && (
        <AccountNudge role="status">
          <button className="close" type="button" onClick={dismissNudge} aria-label="Fechar convite para criar conta"><X /></button>
          <span className="spark"><Sparkles /></span>
          <div>
            <small>Seu pedido está seguro</small>
            <strong>Guarde este pedido na sua conta</strong>
            <p>Crie sua conta para manter histórico, suporte, endereços e benefícios em qualquer dispositivo. Você pode continuar como visitante normalmente.</p>
          </div>
          <div className="benefits">
            <span><ShieldCheck /> Seus pedidos podem ser vinculados com segurança</span>
          </div>
          <button
            className="create"
            type="button"
            onClick={() => window.location.assign(buildAuthEntryUrlForLocation('/register', window.location))}
          >
            <UserPlus /> Criar minha conta
          </button>
          <button className="later" type="button" onClick={dismissNudge}>Agora não</button>
        </AccountNudge>
      )}

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

const AccountNudge = styled.aside`
  position: fixed;
  left: 18px;
  bottom: 86px;
  z-index: 1219;
  width: min(340px, calc(100vw - 36px));
  padding: 15px;
  display: grid;
  grid-template-columns: 38px minmax(0,1fr);
  gap: 10px;
  border: 1px solid #e3e0cf;
  border-radius: 18px;
  background: rgba(255,255,255,.98);
  box-shadow: 0 18px 52px rgba(15,23,42,.18);
  backdrop-filter: blur(10px);
  color:#243044;
  .close{position:absolute;right:8px;top:8px;width:29px;height:29px;border:0;border-radius:9px;background:#f5f7fa;color:#667085;display:grid;place-items:center;cursor:pointer}.close svg{width:14px}
  .spark{width:38px;height:38px;border-radius:12px;background:#fff4df;color:#b7791f;display:grid;place-items:center}.spark svg{width:18px}
  >div{min-width:0;padding-right:22px}small,strong{display:block}small{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#9a6b21;font-weight:900}strong{margin-top:3px;font-size:13px}p{margin:5px 0 0;color:#667085;font-size:9px;line-height:1.45}
  .benefits{grid-column:1/-1;padding:8px 9px;border-radius:10px;background:#f1faf4;color:#2f7047;font-size:8px}.benefits span{display:flex;align-items:center;gap:5px}.benefits svg{width:13px}
  .create{grid-column:1/-1;min-height:38px;border:0;border-radius:11px;background:#d65632;color:#fff;font-size:10px;font-weight:850;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer}.create svg{width:15px}
  .later{grid-column:1/-1;border:0;background:transparent;color:#667085;font-size:9px;font-weight:700;cursor:pointer}
  @media(max-width:480px){left:12px;bottom:72px;width:calc(100vw - 24px);padding:13px;strong{font-size:12px}p{font-size:9px}}
`;

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
