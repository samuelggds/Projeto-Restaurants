import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DialogContext } from '../../components/AppDialog/context';
import { AdminPage } from './AdminPage';
import { adminMockSettings } from './data';
import type { AdminSettings } from './types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function renderAdmin(onSaveSettings: (settings: AdminSettings) => void | Promise<void>) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      createElement(
        DialogContext.Provider,
        {
          value: {
            confirmDialog: vi.fn().mockResolvedValue(true),
            promptDialog: vi.fn().mockResolvedValue(null),
          },
        },
        createElement(AdminPage, {
          initialSettings: {
            ...adminMockSettings,
            restaurantName: 'North Pizza',
            deliveryTime: 45,
          },
          onSaveSettings,
        }),
      ),
    );
  });

  return { container, root };
}

function changeRestaurantName(container: HTMLElement, name: string) {
  const restaurantName = container.querySelector(
    'input[aria-label="Nome do restaurante"]',
  ) as HTMLInputElement;
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    valueSetter?.call(restaurantName, name);
    restaurantName.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function clickNavigation(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  ) as HTMLButtonElement;
  button.click();
}

function cleanup(root: Root, container: HTMLElement) {
  act(() => root.unmount());
  container.remove();
}

describe('AdminPage save feedback', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/admin?settings=brand');
  });

  it('não exibe aviso pendente nem botão fixo enquanto o administrador edita', () => {
    const onSaveSettings = vi
      .fn<(settings: AdminSettings) => Promise<void>>()
      .mockResolvedValue(undefined);
    const { container, root } = renderAdmin(onSaveSettings);

    changeRestaurantName(container, 'North Pizza Atualizada');

    changeRestaurantName(container, 'North Pizza Premium');

    expect(container.textContent).not.toContain('Alterações pendentes');
    expect(container.querySelector('button.save')).toBeNull();
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(0);
    expect(onSaveSettings).not.toHaveBeenCalled();

    cleanup(root, container);
  });

  it('oferece salvar ao trocar de seção e só navega depois do salvamento', async () => {
    const onSaveSettings = vi
      .fn<(settings: AdminSettings) => Promise<void>>()
      .mockResolvedValue(undefined);
    const { container, root } = renderAdmin(onSaveSettings);

    changeRestaurantName(container, 'North Pizza Premium');

    act(() => {
      clickNavigation(container, 'Pedidos');
    });

    const decisionDialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(decisionDialog.textContent).toContain('Você tem alterações pendentes');
    expect(decisionDialog.textContent).toContain('Não salvar');
    expect(decisionDialog.textContent).toContain('Salvar alterações');
    expect(container.querySelector('h1')?.textContent).toBe('Marca e identidade');

    const saveButton = decisionDialog.querySelector('button.save') as HTMLButtonElement;
    await act(async () => {
      saveButton.click();
      await Promise.resolve();
    });

    expect(onSaveSettings).toHaveBeenCalledTimes(1);
    expect(container.querySelector('h1')?.textContent).toBe('Marca e identidade');
    expect((container.querySelector('button.save') as HTMLButtonElement).dataset.progress).toBe(
      'true',
    );
    expect(container.textContent).toContain('Salvando...');

    await act(
      () =>
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 1250);
        }),
    );

    expect(container.querySelector('h1')?.textContent).toBe('Marca e identidade');
    expect(container.textContent).toContain('Alterações salvas com sucesso!');

    await act(
      () =>
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 1450);
        }),
    );

    expect(container.querySelector('h1')?.textContent).toBe('Pedidos');
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    cleanup(root, container);
  });

  it('descarta as mudanças quando escolhe não salvar e confirma isso na nova tela', async () => {
    const onSaveSettings = vi
      .fn<(settings: AdminSettings) => Promise<void>>()
      .mockResolvedValue(undefined);
    const { container, root } = renderAdmin(onSaveSettings);

    changeRestaurantName(container, 'Nome que será descartado');

    act(() => {
      clickNavigation(container, 'Cardápio');
    });

    const discardButton = container.querySelector(
      '[role="dialog"] button.discard',
    ) as HTMLButtonElement;
    await act(async () => {
      discardButton.click();
      await Promise.resolve();
    });

    expect(discardButton.dataset.progress).toBe('true');
    expect(container.textContent).toContain('Descartando...');
    expect(onSaveSettings).not.toHaveBeenCalled();
    expect(container.querySelector('h1')?.textContent).toBe('Marca e identidade');

    await act(
      () =>
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 1250);
        }),
    );

    expect(container.querySelector('h1')?.textContent).toBe('Marca e identidade');
    expect(container.textContent).toContain('Alterações não foram salvas');
    expect(container.textContent).toContain('As mudanças feitas nesta seção foram descartadas.');

    await act(
      () =>
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 1450);
        }),
    );

    expect(container.querySelector('h1')?.textContent).toBe('Cardápio');
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    await act(async () => {
      clickNavigation(container, 'Configurações');
      await Promise.resolve();
    });

    expect(
      (container.querySelector('input[aria-label="Nome do restaurante"]') as HTMLInputElement)
        .value,
    ).toBe('North Pizza');

    cleanup(root, container);
  });
});
