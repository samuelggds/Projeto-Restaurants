import { useState } from 'react';
import { Bell, ChevronDown, ChevronUp, CreditCard, ReceiptText } from 'lucide-react';
import styled from 'styled-components';

type Props = {
  tableNumber: string | number;
  waiterEnabled: boolean;
  billEnabled: boolean;
  accountEnabled: boolean;
  loading: 'WAITER' | 'BILL' | null;
  onCallWaiter: () => void;
  onRequestBill: () => void;
  onOpenAccount: () => void;
};

const Group = styled.section`
  width: min(340px, calc(100vw - 24px));
  display: grid;
  justify-items: end;
  gap: 5px;

  &[data-collapsed='true'] {
    width: 46px;
  }

  @media (max-width: 700px) {
    width: min(300px, 100%);

    &[data-collapsed='true'] {
      width: 46px;
    }
  }
`;

const GroupControl = styled.button`
  width: 100%;
  min-height: 42px;
  padding: 5px 6px;
  border: 1px solid #e4ded7;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #302923;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 6px 18px rgba(55, 38, 26, 0.12);
  font: inherit;
  text-align: left;
  cursor: pointer;

  .control-icon {
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    display: grid;
    place-items: center;
    border-radius: 7px;
    color: var(--home-primary, #d64d08);
    background: color-mix(in srgb, var(--home-primary, #d64d08) 10%, #fff);
  }

  .control-icon svg {
    width: 16px;
    height: 16px;
  }

  .control-copy {
    min-width: 0;
    flex: 1;
    display: grid;
    gap: 1px;
  }

  strong,
  small {
    display: block;
  }

  strong {
    color: #26211d;
    font-size: 11px;
    line-height: 1.2;
    font-weight: 800;
  }

  small {
    color: #776d65;
    font-size: 9px;
    line-height: 1.3;
    font-weight: 600;
  }

  .action {
    flex: 0 0 auto;
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    color: color-mix(in srgb, var(--home-primary, #d64d08) 88%, #2b211b);
    background: color-mix(in srgb, var(--home-primary, #d64d08) 10%, #fff);
  }

  .action svg {
    width: 15px;
    height: 15px;
  }

  &:hover {
    border-color: color-mix(in srgb, var(--home-primary, #d64d08) 52%, #eadfd3);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary, #d64d08) 24%, transparent);
    outline-offset: 2px;
  }

  &[data-collapsed='true'] {
    width: 46px;
    height: 46px;
    min-height: 46px;
    padding: 5px;
    border-radius: 50%;

    .control-icon {
      width: 34px;
      height: 34px;
      flex-basis: 34px;
      border-radius: 50%;
      background: var(--home-primary, #d64d08);
      color: #fff;
    }

    .control-copy,
    .action {
      display: none;
    }
  }
`;

const Card = styled.div`
  width: 100%;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--home-primary) 30%, #eadfd3);
  border-radius: 14px;
  background: rgba(255, 253, 249, 0.97);
  box-shadow: 0 10px 28px rgba(52, 35, 23, 0.14);
  backdrop-filter: blur(14px);

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  b,
  small {
    display: block;
  }

  header b {
    color: #201a16;
    font-size: 12px;
    font-weight: 900;
  }

  header small {
    margin-top: 3px;
    color: #746b64;
    font-size: 10px;
    line-height: 1.35;
  }

  header span {
    flex: 0 0 auto;
    padding: 6px 9px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--home-primary) 11%, white);
    color: var(--home-primary);
    font-size: 10px;
    font-weight: 850;
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  button {
    min-width: 0;
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 8px 10px;
    border: 1px solid #eadfd3;
    border-radius: 12px;
    background: #fff;
    color: #342d28;
    cursor: pointer;
    font: inherit;
    font-size: 11px;
    font-weight: 800;
  }

  button:first-child {
    border-color: color-mix(in srgb, var(--home-primary) 44%, #eadfd3);
  }

  button:last-child {
    border-color: var(--home-primary);
    background: var(--home-primary);
    color: #fff;
  }

  button:disabled {
    cursor: not-allowed;
    filter: grayscale(0.2);
    opacity: 0.55;
  }

  button svg {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
  }

  @media (max-width: 420px) {
    padding: 10px;

    header small {
      max-width: 210px;
    }

    button {
      padding-inline: 6px;
      font-size: 10px;
    }
  }
`;

export function TableServiceActions({
  tableNumber,
  waiterEnabled,
  billEnabled,
  accountEnabled,
  loading,
  onCallWaiter,
  onRequestBill,
  onOpenAccount,
}: Props) {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 700,
  );

  if (!waiterEnabled && !billEnabled && !accountEnabled) return null;

  const tableLabel = String(tableNumber);

  return (
    <Group
      aria-label={`Mesa e atendimento da mesa ${tableLabel}`}
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      <GroupControl
        type="button"
        data-collapsed={collapsed ? 'true' : 'false'}
        data-floating-drag-handle="true"
        data-testid="table-service-actions-toggle"
        aria-expanded={!collapsed}
        aria-label={
          collapsed
            ? `Abrir atendimento da mesa ${tableLabel}`
            : `Minimizar atendimento da mesa ${tableLabel}`
        }
        title={collapsed ? 'Abrir atendimento da mesa' : 'Minimizar atendimento da mesa'}
        onClick={() => setCollapsed((current) => !current)}
      >
        <span className="control-icon" aria-hidden="true">
          <Bell />
        </span>
        <span className="control-copy">
          <strong>Atendimento da mesa</strong>
          <small>Garçom, conta e pagamento · Mesa {tableLabel}</small>
        </span>
        <span className="action" aria-hidden="true">
          {collapsed ? <ChevronUp /> : <ChevronDown />}
        </span>
      </GroupControl>

      {!collapsed && (
        <Card>
          <header>
            <div>
              <b>O que você precisa?</b>
              <small>Envie o pedido diretamente para o painel do salão.</small>
            </div>
            <span>Mesa {tableLabel}</span>
          </header>

          <div className="actions">
            <button
              type="button"
              disabled={!waiterEnabled || loading !== null}
              onClick={onCallWaiter}
            >
              <Bell />
              {loading === 'WAITER' ? 'Enviando...' : 'Chamar garçom'}
            </button>
            <button
              type="button"
              disabled={!billEnabled || loading !== null}
              onClick={onRequestBill}
            >
              <ReceiptText />
              {loading === 'BILL' ? 'Enviando...' : 'Pedir a conta'}
            </button>
            <button type="button" disabled={!accountEnabled} onClick={onOpenAccount}>
              <CreditCard />
              Ver conta
            </button>
          </div>
        </Card>
      )}
    </Group>
  );
}
