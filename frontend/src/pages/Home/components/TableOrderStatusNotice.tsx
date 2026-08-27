import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BellRing,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  Clock3,
  PackageSearch,
  X,
} from 'lucide-react';
import styled from 'styled-components';
import type { TableOrderNotice } from '../domain/tableOrderNotice';

type Props = {
  primaryColor: string;
  tableLabel?: number | string | null;
  order: TableOrderNotice | null;
};

const STEPS = ['Recebido', 'Em preparo', 'Pronto para servir', 'Servido'];

function StatusIcon({ status, size = 20 }: { status: string; size?: number }) {
  if (status === 'PREPARANDO') return <ChefHat size={size} />;
  if (status === 'PRONTO' || status === 'SAIU_PARA_ENTREGA') return <BellRing size={size} />;
  if (status === 'ENTREGUE') return <CheckCircle2 size={size} />;
  if (status === 'CANCELADO') return <X size={size} />;
  return <PackageSearch size={size} />;
}

function statusExplanation(status: string) {
  if (status === 'PREPARANDO') {
    return 'A cozinha está preparando seu pedido. Você pode continuar no cardápio enquanto acompanha por aqui.';
  }
  if (status === 'PRONTO' || status === 'SAIU_PARA_ENTREGA') {
    return 'Tudo pronto! O garçom levará o pedido até esta mesa.';
  }
  if (status === 'ENTREGUE') {
    return 'O pedido já foi servido nesta mesa. Não é necessário confirmar o recebimento.';
  }
  if (status === 'CANCELADO') {
    return 'Este pedido foi cancelado. Se precisar de ajuda ou quiser entender o motivo, chame o garçom.';
  }
  return 'Pedido enviado à cozinha. Assim que o preparo começar, o status será atualizado automaticamente.';
}

const FloatingNotice = styled.button<{ $cancelled: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  max-width: min(380px, calc(100vw - 32px));
  padding: 11px 14px 11px 11px;
  border: 1px solid ${({ $cancelled }) => ($cancelled ? '#e9b7ae' : '#efcbb9')};
  border-radius: 15px;
  background: ${({ $cancelled }) => ($cancelled ? '#fff8f6' : '#fffdf9')};
  color: #201c18;
  box-shadow: 0 14px 32px rgba(55, 38, 26, 0.18);
  text-align: left;
  cursor: pointer;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 38px rgba(55, 38, 26, 0.22);
  }

  .icon {
    display: grid;
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 12px;
    background: ${({ $cancelled }) => ($cancelled ? '#fce6e1' : '#fff0e8')};
    color: ${({ $cancelled }) => ($cancelled ? '#b54435' : 'var(--home-primary, #d64d08)')};
  }

  .copy {
    display: grid;
    min-width: 0;
    flex: 1;
    gap: 2px;
  }

  strong {
    font-size: 13px;
  }

  small {
    overflow: hidden;
    color: #6f6a63;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 700px) {
    max-width: min(360px, 100%);
  }
`;

const Backdrop = styled.div<{ $primary: string }>`
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(25, 24, 22, 0.5);
  --home-primary: ${({ $primary }) => $primary};
`;

const Dialog = styled.section<{ $cancelled: boolean }>`
  width: min(470px, 100%);
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
    padding: 22px;
  }

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .eyebrow {
    display: block;
    margin-bottom: 5px;
    color: var(--home-primary, #d64d08);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    color: #211d19;
    font-size: 21px;
    line-height: 1.2;
  }

  header p {
    margin: 7px 0 0;
    color: #746d65;
    font-size: 13px;
    line-height: 1.45;
  }

  .close {
    display: grid;
    width: 34px;
    height: 34px;
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
    gap: 12px;
    margin: 19px 0 13px;
    padding: 14px;
    border: 1px solid ${({ $cancelled }) => ($cancelled ? '#e9b7ae' : '#f0d8ca')};
    border-radius: 15px;
    background: ${({ $cancelled }) => ($cancelled ? '#fff5f2' : '#fff8f3')};
  }

  .status-icon {
    display: grid;
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 13px;
    background: ${({ $cancelled }) => ($cancelled ? '#fce2dc' : '#fff0e7')};
    color: ${({ $cancelled }) => ($cancelled ? '#b54435' : 'var(--home-primary, #d64d08)')};
  }

  .status-copy {
    display: grid;
    min-width: 0;
    gap: 3px;
  }

  .status strong {
    color: #2a2521;
    font-size: 15px;
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
    margin: 0 2px 17px;
    color: #4b8141;
    font-size: 12px;
    font-weight: 750;
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
    margin: 0 3px 10px;
  }

  .timeline span {
    height: 6px;
    border-radius: 99px;
    background: #e8dfd7;
  }

  .timeline span.active {
    background: var(--home-primary, #d64d08);
  }

  .steps {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    margin-bottom: 19px;
    color: #8c837b;
    font-size: 10px;
    line-height: 1.25;
    text-align: center;
  }

  .steps .active {
    color: #2e2925;
    font-weight: 800;
  }

  .items-panel {
    display: grid;
    gap: 10px;
    margin-bottom: 14px;
    padding: 14px;
    border: 1px solid #eadfd3;
    border-radius: 15px;
    background: #fff;
  }

  .items-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .items-header h3 {
    margin: 0;
    color: #2a2521;
    font-size: 14px;
  }

  .items-header span {
    padding: 4px 8px;
    border-radius: 999px;
    background: #f7f1ea;
    color: #6f675f;
    font-size: 10px;
    font-weight: 800;
  }

  .items-list {
    display: grid;
    gap: 8px;
  }

  .order-item {
    display: grid;
    gap: 6px;
    padding: 11px;
    border: 1px solid #eee4da;
    border-radius: 12px;
    background: #fffcf8;
  }

  .item-name {
    display: flex;
    align-items: baseline;
    gap: 7px;
    color: #29241f;
    font-size: 13px;
  }

  .item-name b {
    color: var(--home-primary, #d64d08);
    font-size: 12px;
  }

  .choice-group {
    display: grid;
    grid-template-columns: minmax(80px, auto) minmax(0, 1fr);
    gap: 7px;
    color: #6f675f;
    font-size: 11px;
    line-height: 1.4;
  }

  .choice-group b {
    color: #49423c;
  }

  .item-observation {
    padding: 7px 9px;
    border-left: 3px solid var(--home-primary, #d64d08);
    border-radius: 4px 8px 8px 4px;
    background: #fff4ed;
    color: #6b4b3c;
    font-size: 11px;
    line-height: 1.4;
  }

  .explanation {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 13px;
    border-radius: 13px;
    background: ${({ $cancelled }) => ($cancelled ? '#fff0ec' : '#f4f7f1')};
    color: ${({ $cancelled }) => ($cancelled ? '#8e392e' : '#465a40')};
    font-size: 12px;
    line-height: 1.5;
  }

  .explanation svg {
    flex: 0 0 auto;
    margin-top: 1px;
  }

  @media (max-width: 520px) {
    border-radius: 19px;

    .content {
      padding: 18px;
    }

    h2 {
      font-size: 19px;
    }

    .steps {
      font-size: 9px;
    }

    .choice-group {
      grid-template-columns: 1fr;
      gap: 1px;
    }
  }
`;

export function TableOrderStatusNotice({ primaryColor, tableLabel, order }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  if (!order) return null;

  const totalItems = order.items.reduce((total, item) => total + item.quantity, 0);
  const normalizedTableLabel = String(tableLabel || '').trim();
  const title = normalizedTableLabel
    ? `Pedido da mesa ${normalizedTableLabel}`
    : 'Pedido feito na mesa';

  return (
    <>
      <FloatingNotice type="button" $cancelled={order.cancelled} onClick={() => setIsOpen(true)}>
        <i className="icon">
          <StatusIcon status={order.status} />
        </i>
        <span className="copy">
          <strong>Status do pedido da mesa</strong>
          <small>{order.statusLabel}</small>
        </span>
        <ChevronRight size={18} />
      </FloatingNotice>

      {isOpen &&
        createPortal(
          <Backdrop $primary={primaryColor} role="presentation" onClick={() => setIsOpen(false)}>
            <Dialog
              $cancelled={order.cancelled}
              role="dialog"
              aria-modal="true"
              aria-labelledby="table-order-status-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="content">
                <header>
                  <div>
                    <span className="eyebrow">Cardápio digital · acompanhamento</span>
                    <h2 id="table-order-status-title">{title}</h2>
                    <p>Acompanhe o preparo até o pedido ser servido, sem sair do cardápio.</p>
                  </div>
                  <button
                    className="close"
                    type="button"
                    aria-label="Fechar status do pedido"
                    onClick={() => setIsOpen(false)}
                  >
                    <X size={18} />
                  </button>
                </header>

                <div className="status">
                  <i className="status-icon">
                    <StatusIcon status={order.status} size={21} />
                  </i>
                  <span className="status-copy">
                    <strong>{order.statusLabel}</strong>
                    <small>{order.summary}</small>
                  </span>
                </div>

                {!order.cancelled && (
                  <>
                    <div className="live">
                      <i /> Atualizado automaticamente pela cozinha e pelo garçom
                    </div>
                    <div className="timeline" aria-label={`Progresso: ${order.statusLabel}`}>
                      {STEPS.map((step, index) => (
                        <span key={step} className={index < order.progress ? 'active' : ''} />
                      ))}
                    </div>
                    <div className="steps">
                      {STEPS.map((step, index) => (
                        <span key={step} className={index < order.progress ? 'active' : ''}>
                          {step}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {order.items.length > 0 && (
                  <section className="items-panel" aria-label="Itens deste pedido">
                    <div className="items-header">
                      <h3>Todos os itens deste pedido</h3>
                      <span>
                        {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    <div className="items-list">
                      {order.items.map((item, itemIndex) => (
                        <article className="order-item" key={`${item.name}-${itemIndex}`}>
                          <strong className="item-name">
                            <b>{item.quantity}×</b>
                            {item.name}
                          </strong>
                          {item.customizations.map((group, groupIndex) => (
                            <div className="choice-group" key={`${group.groupName}-${groupIndex}`}>
                              <b>{group.groupName}</b>
                              <span>{group.options.join(', ')}</span>
                            </div>
                          ))}
                          {item.observation && (
                            <span className="item-observation">Obs.: {item.observation}</span>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                <div className="explanation">
                  {order.cancelled ? <X size={18} /> : <Clock3 size={18} />}
                  <span>{statusExplanation(order.status)}</span>
                </div>
              </div>
            </Dialog>
          </Backdrop>,
          document.body,
        )}
    </>
  );
}
