import { useMemo, useState } from 'react';
import { Headphones, LockKeyhole, MessageCircle, PackageSearch, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { getGuestOwnedOrderProofs } from '../../Services/ordersService';

export function PublicGuestOrderHelp({ restaurantSlug }: { restaurantSlug: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const proofs = useMemo(() => getGuestOwnedOrderProofs().slice().reverse(), [open]);

  const goToOrder = (orderId: number) => {
    setOpen(false);
    navigate(`/orders/${orderId}/tracking`);
  };

  return (
    <>
      <Launcher type="button" onClick={() => setOpen(true)} aria-label="Ajuda com um pedido">
        <Headphones />
        <span>
          <b>Ajuda com um pedido</b>
          <small>Acompanhe ou fale com o suporte</small>
        </span>
      </Launcher>

      {open ? (
        <Backdrop role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <Dialog role="dialog" aria-modal="true" aria-label="Ajuda com um pedido">
            <Header>
              <div>
                <span className="mark"><Headphones /></span>
                <span>
                  <strong>Ajuda com um pedido</strong>
                  <small>{restaurantSlug ? `Atendimento de ${restaurantSlug.replace(/-/g, ' ')}` : 'Atendimento do restaurante'}</small>
                </span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X /></button>
            </Header>

            {proofs.length ? (
              <Content>
                <Intro>
                  <PackageSearch />
                  <div>
                    <strong>Pedidos reconhecidos neste navegador</strong>
                    <p>Escolha um pedido para abrir o acompanhamento seguro e falar com o restaurante.</p>
                  </div>
                </Intro>
                <OrderList>
                  {proofs.map(({ orderId }) => (
                    <OrderButton key={orderId} type="button" onClick={() => goToOrder(orderId)}>
                      <span>
                        <b>Pedido #{orderId}</b>
                        <small>Comprovante seguro disponível</small>
                      </span>
                      <MessageCircle />
                    </OrderButton>
                  ))}
                </OrderList>
                <SecurityNote>
                  <LockKeyhole />
                  <span>
                    <b>Proteção contra acesso indevido</b>
                    <small>Não liberamos pedidos apenas pelo número, telefone ou CPF.</small>
                  </span>
                </SecurityNote>
              </Content>
            ) : (
              <EmptyState>
                <LockKeyhole />
                <strong>Nenhum pedido seguro foi encontrado neste navegador</strong>
                <p>
                  Depois que você fizer um pedido como visitante, este navegador guardará um comprovante seguro para acessar acompanhamento e suporte sem precisar criar conta.
                </p>
                <small>
                  Se o pedido foi feito em outro aparelho ou navegador, não mostramos informações só pelo número do pedido para proteger seus dados.
                </small>
              </EmptyState>
            )}
          </Dialog>
        </Backdrop>
      ) : null}
    </>
  );
}

const Launcher = styled.button`
  position: fixed;
  right: 18px;
  bottom: 84px;
  z-index: 1218;
  min-height: 50px;
  max-width: min(280px, calc(100vw - 36px));
  padding: 8px 12px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  border: 1px solid #e5ddd8;
  border-radius: 15px;
  background: rgba(255,255,255,.98);
  color: #202936;
  box-shadow: 0 14px 38px rgba(15,23,42,.14);
  backdrop-filter: blur(8px);
  text-align: left;
  cursor: pointer;
  > svg { width:18px; justify-self:center; color:#d65632; }
  b,small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  b{font-size:10px;} small{margin-top:2px;color:#7b8798;font-size:8px;}
  &:hover{border-color:#dfa48f;transform:translateY(-1px);}
  &:focus-visible{outline:3px solid rgba(214,86,50,.18);outline-offset:2px;}
  @media(max-width:480px){right:12px;bottom:max(72px,calc(env(safe-area-inset-bottom) + 64px));max-width:calc(100vw - 24px);min-height:46px;grid-template-columns:32px minmax(0,1fr);}
`;

const Backdrop = styled.div`
  position:fixed;inset:0;z-index:3300;display:grid;place-items:center;padding:24px;background:rgba(15,23,42,.48);backdrop-filter:blur(6px);
  @media(max-width:640px){padding:0;place-items:stretch;}
`;

const Dialog = styled.section`
  width:min(560px,100%);max-height:min(680px,calc(100dvh - 48px));overflow:hidden;display:grid;grid-template-rows:auto minmax(0,1fr);background:#fff;border:1px solid #e2e8f0;border-radius:20px;box-shadow:0 30px 90px rgba(15,23,42,.26);color:#172033;
  @media(max-width:640px){width:100vw;height:100dvh;max-height:none;border:0;border-radius:0;}
`;

const Header = styled.header`
  min-height:70px;padding:13px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e8edf3;
  >div{display:flex;align-items:center;gap:10px;min-width:0}.mark{width:40px;height:40px;border-radius:12px;background:#fff1eb;color:#d65632;display:grid;place-items:center}.mark svg{width:19px}strong,small{display:block}strong{font-size:15px}small{margin-top:2px;color:#768397;font-size:10px;text-transform:capitalize}button{width:38px;height:38px;border:1px solid #dde4ed;border-radius:10px;background:#fff;display:grid;place-items:center;cursor:pointer}button svg{width:17px}
  @media(max-width:640px){padding-top:max(12px,env(safe-area-inset-top));}
`;

const Content = styled.div`min-height:0;overflow:auto;padding:18px;display:grid;gap:15px;align-content:start;background:#f8fafc;@media(max-width:480px){padding:14px;}`;
const Intro = styled.div`display:flex;gap:10px;align-items:flex-start;svg{width:23px;color:#d65632;flex:0 0 auto;margin-top:2px}strong{font-size:13px}p{margin:4px 0 0;color:#667085;font-size:10px;line-height:1.45}`;
const OrderList = styled.div`display:grid;gap:9px;`;
const OrderButton = styled.button`
  width:100%;padding:13px;display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e1e7ef;border-radius:13px;background:#fff;text-align:left;cursor:pointer;box-shadow:0 6px 16px rgba(15,23,42,.04);span{min-width:0}b,small{display:block}b{font-size:12px}small{margin-top:3px;color:#708095;font-size:9px}svg{width:18px;color:#d65632;flex:0 0 auto}&:hover{border-color:#e0aa98}
`;
const SecurityNote = styled.div`padding:11px 12px;display:flex;gap:8px;align-items:flex-start;border:1px solid #cee5d7;border-radius:12px;background:#f1faf4;color:#2f7047;svg{width:17px;flex:0 0 auto}b,small{display:block}b{font-size:10px}small{margin-top:2px;font-size:8px;line-height:1.4}`;
const EmptyState = styled.div`min-height:360px;padding:28px;display:grid;place-items:center;align-content:center;text-align:center;gap:9px;background:#f8fafc;svg{width:34px;color:#d65632}strong{max-width:360px;font-size:15px}p{max-width:390px;margin:0;color:#667085;font-size:11px;line-height:1.55}small{max-width:390px;color:#8b96a8;font-size:9px;line-height:1.5}`;