import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminMockSettings } from '../data';
import { TableMenuSettings } from './TableMenuSettings';

describe('TableMenuSettings', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('reflete o recurso operacional de pedidos por QR Code', () => {
    act(() =>
      root.render(
        <TableMenuSettings
          settings={{
            ...adminMockSettings,
            tableOrderingEnabled: true,
            waiterCallEnabled: false,
            billRequestEnabled: true,
          }}
          update={() => undefined}
        />,
      ),
    );

    expect(
      (container.querySelector('[aria-label="Pedidos por QR Code"]') as HTMLInputElement).checked,
    ).toBe(true);
    expect(container.querySelector('[aria-label="Chamar garçom"]')).toBeNull();
    expect(container.querySelector('[aria-label="Pedir a conta"]')).toBeNull();
  });

  it('encaminha a alteração do pedido por mesa ao estado da tela', () => {
    const update = vi.fn();
    act(() =>
      root.render(
        <TableMenuSettings
          settings={{ ...adminMockSettings, tableOrderingEnabled: false }}
          update={update}
        />,
      ),
    );

    act(() =>
      (container.querySelector('[aria-label="Pedidos por QR Code"]') as HTMLInputElement).click(),
    );

    expect(update).toHaveBeenCalledWith('tableOrderingEnabled', true);
  });

  it('não exibe mais código ou ação simulada de geração', () => {
    act(() =>
      root.render(<TableMenuSettings settings={adminMockSettings} update={() => undefined} />),
    );

    expect(container.textContent).not.toContain('4827');
    expect(container.textContent).not.toContain('Gerar novo código');
    expect(container.textContent).toContain('Mesas e códigos de acesso');
    expect(container.textContent).toContain('Próximas integrações do salão');
    expect(container.textContent).toContain('EM PREPARAÇÃO');
  });
});
