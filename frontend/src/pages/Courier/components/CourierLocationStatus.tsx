import { LocateFixed } from 'lucide-react';
import styled from 'styled-components';

type Props = { connected: boolean; message: string; hint: string };

export function CourierLocationStatus({ connected, message, hint }: Props) {
  return (
    <Status role="status" aria-label="Status da localização" title={message}>
      <LocateFixed className="location-icon" aria-hidden="true" />
      <div>
        <div className="status-heading">
          <strong>Localização ativa nesta conta</strong>
          <span className="connection" data-connected={connected}>
            <i aria-hidden="true" />
            {connected ? 'Conectado' : 'Reconectando'}
          </span>
        </div>
        <small>{hint || message}</small>
      </div>
    </Status>
  );
}

const Status = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  width: min(360px, 100%);
  min-width: 0;
  box-sizing: border-box;
  padding: 9px 12px;
  border: 1px solid #d8e6dd;
  border-radius: 12px;
  background: #f5f9f6;
  color: #285740;
  .location-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    color: #338757;
  }
  > div {
    min-width: 0;
    flex: 1;
  }
  .status-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 9px;
  }
  strong {
    font-size: 11px;
    font-weight: 700;
    line-height: 1.5;
  }
  .connection {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.5;
    color: #286643;
  }
  .connection i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #399660;
  }
  .connection[data-connected='false'] {
    color: #955a1f;
  }
  .connection[data-connected='false'] i {
    background: #b9772b;
  }
  small {
    display: block;
    margin-top: 3px;
    font-size: 11px;
    line-height: 1.5;
    color: #626e63;
    overflow-wrap: anywhere;
  }
  @media (max-width: 650px) {
    width: 100%;
  }
`;
