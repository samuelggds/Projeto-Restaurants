import { BellRing, CreditCard, ReceiptText } from 'lucide-react';
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

const Card = styled.section`
  width: min(340px, calc(100vw - 24px));
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--home-primary) 30%, #eadfd3);
  border-radius: 18px;
  background: rgba(255, 253, 249, 0.97);
  box-shadow: 0 16px 45px rgba(52, 35, 23, 0.16);
  backdrop-filter: blur(14px);

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 11px;
  }

  header div {
    min-width: 0;
  }

  b,
  small {
    display: block;
  }

  header b {
    color: #201a16;
    font-size: 13px;
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

  .helper {
    margin: 0 0 10px;
    padding: 8px 10px;
    border-radius: 12px;
    color: #5f554d;
    background: color-mix(in srgb, var(--home-primary) 6%, #fff);
    font-size: 10px;
    line-height: 1.35;
    font-weight: 700;
  }

  div.actions {
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
    width: 100%;
    padding: 10px;

    header small {
      max-width: 220px;
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
  if (!waiterEnabled && !billEnabled && !accountEnabled) return null;

  return (
    <Card aria-label={`Mesa e atendimento da mesa ${String(tableNumber)}`}>
      <header>
        <div>
          <b>Mesa e atendimento</b>
          <small>Aqui você controla o atendimento sem precisar sair do cardápio.</small>
        </div>
        <span>Mesa {String(tableNumber)}</span>
      </header>

      <p className="helper">Chame o garçom, peça a conta ou abra sua conta da mesa.</p>

      <div className="actions">
        <button type="button" disabled={!waiterEnabled || loading !== null} onClick={onCallWaiter}>
          <BellRing />
          {loading === 'WAITER' ? 'Enviando...' : 'Chamar garçom'}
        </button>
        <button type="button" disabled={!billEnabled || loading !== null} onClick={onRequestBill}>
          <ReceiptText />
          {loading === 'BILL' ? 'Enviando...' : 'Pedir a conta'}
        </button>
        <button type="button" disabled={!accountEnabled} onClick={onOpenAccount}>
          <CreditCard />
          Ver conta
        </button>
      </div>
    </Card>
  );
}
