import { BellRing, ReceiptText } from 'lucide-react';
import styled from 'styled-components';
import { adminMockSettings } from '../data';
import * as S from '../Admin.styles';

type Props = {
  settings: typeof adminMockSettings;
  update: <K extends keyof typeof adminMockSettings>(
    key: K,
    value: (typeof adminMockSettings)[K],
  ) => void;
};

const Panel = styled(S.SettingSection)`
  .feature-row {
    min-width: 0;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) auto;
    align-items: center;
    gap: 13px;
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px;
    background: #fff;
  }

  .feature-row + .feature-row {
    margin-top: 10px;
  }

  .feature-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, #fff);
  }

  .feature-copy {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .feature-copy b {
    color: var(--text);
    font-size: 13px;
  }

  .feature-copy span {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.45;
  }

  .feature-status {
    border-radius: 999px;
    padding: 6px 9px;
    color: #765a31;
    background: #fff4dc;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }

  @media (max-width: 520px) {
    .feature-row {
      grid-template-columns: 38px minmax(0, 1fr);
    }

    .feature-status {
      grid-column: 2;
      width: max-content;
    }
  }
`;

export function TableMenuSettings({ settings, update }: Props) {
  return (
    <Panel>
      <S.Card>
        <h2>Pedidos pelo cardápio de mesa</h2>
        <p>Ative somente quando as mesas e os códigos temporários estiverem preparados.</p>
        <S.ToggleRows>
          <label className="toggle-row">
            <div>
              <b>Pedidos por QR Code</b>
              <span>O cliente valida a mesa, monta o produto e envia o pedido para a cozinha.</span>
            </div>
            <input
              type="checkbox"
              role="switch"
              aria-label="Pedidos por QR Code"
              checked={settings.tableOrderingEnabled}
              onChange={(event) => update('tableOrderingEnabled', event.target.checked)}
            />
          </label>
        </S.ToggleRows>
      </S.Card>
      <S.Card>
        <h2>Mesas e códigos de acesso</h2>
        <p>
          Os códigos são temporários e devem ser gerados pela equipe somente ao abrir o atendimento
          de uma mesa. Assim, cada pedido permanece vinculado ao restaurante e à sessão correta.
        </p>
      </S.Card>
      <S.Card>
        <h2>Próximas integrações do salão</h2>
        <p>
          Estes recursos só serão liberados quando o painel do garçom puder receber e registrar as
          solicitações em tempo real. Assim o cliente nunca verá uma confirmação falsa.
        </p>
        <div className="feature-row">
          <span className="feature-icon" aria-hidden="true">
            <BellRing size={20} />
          </span>
          <span className="feature-copy">
            <b>Chamar garçom</b>
            <span>Chamado com fila, responsável e confirmação de atendimento.</span>
          </span>
          <span className="feature-status">EM PREPARAÇÃO</span>
        </div>
        <div className="feature-row">
          <span className="feature-icon" aria-hidden="true">
            <ReceiptText size={20} />
          </span>
          <span className="feature-copy">
            <b>Pedir a conta</b>
            <span>Solicitação vinculada à mesa e encerrada somente pela equipe.</span>
          </span>
          <span className="feature-status">EM PREPARAÇÃO</span>
        </div>
      </S.Card>
    </Panel>
  );
}
