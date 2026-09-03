import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bike, ChefHat, ChevronRight, Clock3, PackageCheck, PackageSearch, X } from 'lucide-react';
import styled from 'styled-components';
import type { ActiveOrderNotice as ActiveOrder } from '../domain/activeOrderNotice';

type Props = {
  primaryColor: string;
  order: ActiveOrder | null;
  onTrack: (orderId: string) => void;
  onConfirmDelivery: (orderId: string) => Promise<void>;
};

const DELIVERY_STATUS = 'SAIU_PARA_ENTREGA';

function StatusIcon({ status, size = 20 }: { status: string; size?: number }) {
  if (status === DELIVERY_STATUS) return <Bike size={size} />;
  if (status === 'PREPARANDO') return <ChefHat size={size} />;
  if (status === 'PRONTO') return <PackageCheck size={size} />;
  return <PackageSearch size={size} />;
}

function progressFor(status: string) {
  if (status === 'ENTREGUE') return 4;
  return ['PENDENTE', 'PREPARANDO', 'PRONTO', DELIVERY_STATUS].indexOf(status) + 1;
}

const FloatingNotice = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(320px, calc(100vw - 32px));
  min-height: 52px;
  padding: 7px 9px 7px 7px;
  border: 1px solid #e5dfd8;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.98);
  color: #201c18;
  box-shadow: 0 5px 16px rgba(55, 38, 26, 0.11);
  text-align: left;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
  cursor: pointer;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 38px rgba(55, 38, 26, 0.22);
  }
  .icon {
    display: grid;
    width: 36px;
    height: 36px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 7px;
    background: #fff0e8;
    color: var(--home-primary, #d64d08);
  }
  span {
    display: grid;
    min-width: 0;
    gap: 2px;
  }
  strong {
    font-size: 12px;
  }
  small {
    overflow: hidden;
    color: #6f6a63;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  @media (max-width: 700px) {
    width: min(300px, 100%);
  }
`;

const Backdrop = styled.div<{ $primary: string }>`
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(25, 24, 22, 0.48);
  --home-primary: ${({ $primary }) => $primary};
`;

const Dialog = styled.section`
  width: min(420px, 100%);
  overflow: hidden;
  border: 1px solid #eadfd3;
  border-radius: 22px;
  background: #fffdf9;
  box-shadow: 0 24px 55px rgba(25, 24, 22, 0.32);
  animation: reveal 220ms ease-out;
  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  .content {
    padding: 20px;
  }
  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }
  h2 {
    margin: 0;
    color: #211d19;
    font-size: 20px;
    line-height: 1.2;
  }
  header p {
    margin: 6px 0 0;
    color: #746d65;
    font-size: 13px;
    line-height: 1.45;
  }
  .close {
    display: grid;
    width: 32px;
    height: 32px;
    flex: 0 0 auto;
    place-items: center;
    border: 0;
    border-radius: 50%;
    background: #f7f1ea;
    color: #4a433d;
    cursor: pointer;
  }
  .status {
    display: flex;
    align-items: center;
    gap: 11px;
    margin: 18px 0 14px;
    padding: 13px;
    border: 1px solid #f0d8ca;
    border-radius: 14px;
    background: #fff8f3;
  }
  .status-icon {
    display: grid;
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 12px;
    background: #fff0e7;
    color: var(--home-primary, #d64d08);
  }
  .status span {
    display: grid;
    min-width: 0;
    gap: 3px;
  }
  .status strong {
    color: #2a2521;
    font-size: 14px;
  }
  .status small {
    overflow: hidden;
    color: #716961;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .live {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 16px;
    color: #4b8141;
    font-size: 12px;
    font-weight: 700;
  }
  .live i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #5d9e42;
    box-shadow: 0 0 0 4px rgba(93, 158, 66, 0.12);
  }
  .timeline {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 5px;
    margin: 0 2px 18px;
  }
  .timeline span {
    height: 5px;
    border-radius: 99px;
    background: #e8dfd7;
    transition:
      background 300ms ease,
      transform 300ms ease;
  }
  .timeline span.active {
    background: var(--home-primary, #d64d08);
    transform: scaleY(1.35);
  }
  .steps {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    margin: -12px 0 18px;
    color: #8c837b;
    font-size: 10px;
    text-align: center;
  }
  .steps .active {
    color: #2e2925;
    font-weight: 700;
  }
  .track {
    display: flex;
    width: 100%;
    height: 46px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 12px;
    background: var(--home-primary, #d64d08);
    color: #fff;
    font-weight: 800;
    cursor: pointer;
    transition:
      filter 180ms ease,
      transform 180ms ease;
  }
  .track:hover {
    filter: brightness(0.94);
    transform: translateY(-1px);
  }
  .waiting {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 12px;
    border-radius: 12px;
    background: #f5f1ec;
    color: #675f57;
    font-size: 12px;
    line-height: 1.45;
  }
  .waiting svg {
    flex: 0 0 auto;
    color: #a07553;
  }
  .receipt {
    display: grid;
    gap: 10px;
    padding: 13px;
    border: 1px solid #cfe1c8;
    border-radius: 12px;
    background: #f5fbf3;
    color: #3d5e35;
    font-size: 12px;
    line-height: 1.45;
  }
  .receipt button {
    display: flex;
    width: 100%;
    height: 42px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 10px;
    background: #4d913c;
    color: #fff;
    font-weight: 800;
    cursor: pointer;
    transition:
      filter 180ms ease,
      transform 180ms ease;
  }
  .receipt button:hover:not(:disabled) {
    filter: brightness(0.95);
    transform: translateY(-1px);
  }
  .receipt button:disabled {
    cursor: wait;
    opacity: 0.7;
  }
  .receipt-error {
    margin: 0;
    color: #b83d2d;
    font-size: 12px;
  }
`;

export function ActiveOrderNotice({ primaryColor, order, onTrack, onConfirmDelivery }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  if (!order) return null;

  const isOutForDelivery = order.status === DELIVERY_STATUS;
  const isDelivered = order.status === 'ENTREGUE';
  const progress = progressFor(order.status);
  const track = () => {
    setIsOpen(false);
    onTrack(order.id);
  };
  const confirmReceipt = async () => {
    setConfirmationError(null);
    setIsConfirming(true);
    try {
      await onConfirmDelivery(order.id);
      setIsOpen(false);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      setConfirmationError(
        apiError.response?.data?.error ||
          (error instanceof Error ? error.message : 'Não foi possível confirmar o recebimento.'),
      );
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <>
      <FloatingNotice type="button" onClick={() => setIsOpen(true)}>
        <i className="icon">
          <StatusIcon status={order.status} />
        </i>
        <span>
          <strong>Pedido em andamento</strong>
          <small>
            {order.statusLabel} · Pedido #{order.id}
          </small>
        </span>
        <ChevronRight size={18} />
      </FloatingNotice>
      {isOpen &&
        createPortal(
          <Backdrop $primary={primaryColor} role="presentation" onClick={() => setIsOpen(false)}>
            <Dialog
              role="dialog"
              aria-modal="true"
              aria-labelledby="active-order-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="content">
                <header>
                  <div>
                    <h2 id="active-order-title">Pedido #{order.id}</h2>
                    <p>Acompanhe cada etapa do seu pedido automaticamente.</p>
                  </div>
                  <button
                    className="close"
                    type="button"
                    aria-label="Fechar aviso"
                    onClick={() => setIsOpen(false)}
                  >
                    <X size={18} />
                  </button>
                </header>
                <div className="status">
                  <i className="status-icon">
                    <StatusIcon status={order.status} />
                  </i>
                  <span>
                    <strong>{order.statusLabel}</strong>
                    <small>{order.summary}</small>
                  </span>
                </div>
                <div className="live">
                  <i /> Status atualizado automaticamente
                </div>
                <div className="timeline" aria-label={`Progresso: ${order.statusLabel}`}>
                  {[1, 2, 3, 4].map((step) => (
                    <span key={step} className={step <= progress ? 'active' : ''} />
                  ))}
                </div>
                <div className="steps">
                  <span className={progress >= 1 ? 'active' : ''}>Confirmado</span>
                  <span className={progress >= 2 ? 'active' : ''}>Preparo</span>
                  <span className={progress >= 3 ? 'active' : ''}>Pronto</span>
                  <span className={progress >= 4 ? 'active' : ''}>Entrega</span>
                </div>
                {isOutForDelivery ? (
                  <button className="track" type="button" onClick={track}>
                    <Bike size={19} /> Acompanhar entrega no GPS <ChevronRight size={18} />
                  </button>
                ) : isDelivered ? (
                  <div className="receipt">
                    <span>
                      Seu pedido foi marcado como entregue. Confirme o recebimento para avisar o
                      restaurante.
                    </span>
                    <button
                      type="button"
                      onClick={() => void confirmReceipt()}
                      disabled={isConfirming}
                    >
                      <PackageCheck size={18} />{' '}
                      {isConfirming ? 'Confirmando...' : 'Confirmar recebimento'}
                    </button>
                    {confirmationError && <p className="receipt-error">{confirmationError}</p>}
                  </div>
                ) : (
                  <div className="waiting">
                    <Clock3 size={18} /> O rastreamento por GPS será liberado quando o motoqueiro
                    sair para a entrega.
                  </div>
                )}
              </div>
            </Dialog>
          </Backdrop>,
          document.body,
        )}
    </>
  );
}
