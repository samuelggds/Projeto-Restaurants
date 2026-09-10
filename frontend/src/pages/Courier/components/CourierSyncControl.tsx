import { RefreshCw } from 'lucide-react';
import styled from 'styled-components';

type Props = {
  lastUpdatedAt: Date | null;
  loading: boolean;
  failed: boolean;
  connected: boolean;
  onRefresh: () => void;
};

export function CourierSyncControl({
  lastUpdatedAt,
  loading,
  failed,
  connected,
  onRefresh,
}: Props) {
  const status = loading
    ? 'Consultando pedidos...'
    : failed
      ? 'Atualização pendente'
      : connected
        ? 'Atualização automática'
        : 'Atualização periódica';
  return (
    <Control data-failed={failed}>
      <div role="status" aria-live="polite">
        <b>{status}</b>
        <small>
          {lastUpdatedAt
            ? `Pedidos atualizados às ${lastUpdatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
            : 'Aguardando a primeira consulta'}
        </small>
      </div>
      <button
        type="button"
        aria-label="Sincronizar pedidos"
        title="Sincronizar pedidos"
        disabled={loading}
        onClick={onRefresh}
      >
        <RefreshCw aria-hidden="true" />
        <span>Sincronizar</span>
      </button>
    </Control>
  );
}

const Control = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  b,
  small {
    display: block;
  }
  b {
    color: #176b52;
    font-size: 12px;
  }
  small {
    margin-top: 3px;
    color: #637369;
    font-size: 11px;
  }
  &[data-failed='true'] b {
    color: #9a481c;
  }
  button {
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 10px;
    border: 1px solid #cfe0da;
    border-radius: 8px;
    color: #176b52;
    background: #f3f9f6;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
  }
  button:disabled {
    cursor: wait;
    opacity: 0.65;
  }
  button:focus-visible {
    outline: 3px solid #176b52;
    outline-offset: 2px;
  }
  svg {
    width: 19px;
    height: 19px;
  }
  @media (max-width: 650px) {
    width: 100%;
    justify-content: space-between;
    margin-left: 0;
  }
`;
