import styled from 'styled-components';
import { demoRoleLabels, type DemoRole } from './demoDomain';
import type { DemoCustomerView } from './useDemoCustomerView';

const Dock = styled.details`
  position: fixed;
  left: 16px;
  bottom: 16px;
  z-index: 10000;
  width: 244px;
  max-width: calc(100vw - 32px);
  box-sizing: border-box;
  border: 1px solid #e1d9e6;
  border-radius: 12px;
  background: #fff;
  color: #28212d;
  box-shadow: 0 8px 30px #26183122;
  font:
    13px Inter,
    system-ui,
    sans-serif;
  body:has([role='dialog'][aria-modal='true']) & {
    visibility: hidden;
  }
  summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 6px 12px;
    font-weight: 750;
    list-style: none;
  }
  summary::after {
    content: '⌃';
    margin-left: auto;
  }
  &[open] summary::after {
    content: '⌄';
  }
  &[open] {
    width: 320px;
  }
  img {
    width: 32px;
    height: 28px;
    object-fit: contain;
  }
  div {
    padding: 12px;
    border-top: 1px solid #eee;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
  label {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 6px;
  }
  select,
  button {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    min-height: 42px;
    border: 1px solid #dfd8e3;
    background: #faf8fb;
    border-radius: 7px;
    padding: 8px;
    font: inherit;
    cursor: pointer;
  }
  p {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: #6f6375;
  }
  @media (max-width: 820px) {
    bottom: 78px;
    width: 200px;
  }
`;

export function DemoControls({
  role,
  customerView,
  onRole,
  onReset,
  onExit,
  storageUnavailable,
}: {
  role: DemoRole;
  customerView: DemoCustomerView;
  onRole: (role: DemoRole | 'CLIENTE_QR') => void;
  onReset: () => void;
  onExit: () => void;
  storageUnavailable: boolean;
}) {
  return (
    <Dock>
      <summary>
        <img src="/gastronexa-logo.svg" alt="" />
        Demonstração
      </summary>
      <div>
        <p>Restaurante fictício. Pedidos e pagamentos são simulados.</p>
        <label>
          Ver como
          <select
            aria-label="Ver demonstração como"
            value={role === 'CLIENTE' && customerView === 'QR' ? 'CLIENTE_QR' : role}
            onChange={(event) => onRole(event.target.value as DemoRole | 'CLIENTE_QR')}
          >
            <option value="CLIENTE">Cliente · Home / delivery</option>
            <option value="CLIENTE_QR">Cliente · Cardápio da mesa (QR Code)</option>
            {Object.entries(demoRoleLabels)
              .filter(([value]) => value !== 'CLIENTE')
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </select>
        </label>
        <button type="button" onClick={onReset}>
          Reiniciar cenário
        </button>
        <button type="button" onClick={onExit}>
          Sair da demonstração
        </button>
        {storageUnavailable && (
          <p role="status">
            Armazenamento indisponível. O cenário funciona nesta tela até você sair.
          </p>
        )}
      </div>
    </Dock>
  );
}
