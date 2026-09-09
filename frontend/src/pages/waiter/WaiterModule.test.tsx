import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WaiterModule, type WaiterModuleProps } from './WaiterModule';

vi.mock('../../features/employee-help/useEmployeeIssueNotifications', () => ({
  useEmployeeIssueNotifications: vi.fn(),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const props: WaiterModuleProps = {
  employee: {
    id: '4',
    name: 'Ana Garçom',
    email: 'ana@restaurant.test',
    role: 'WAITER',
    shift: '18:00',
  },
  restaurant: { restaurantName: 'Restaurante Teste', monogram: 'RT', primaryColor: '#d64d08' },
  data: { orders: [], tables: [], calls: [], accounts: [] },
  workspaceState: { loading: false, refreshing: false, error: null, lastUpdatedAt: null },
};

describe('WaiterModule navigation and loading states', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function render(overrides: Partial<WaiterModuleProps> = {}) {
    act(() => root.render(<WaiterModule {...props} {...overrides} />));
  }

  it('distingue carregamento inicial e falha de um salão vazio confirmado', () => {
    const onRefresh = vi.fn();
    render({ workspaceState: { ...props.workspaceState!, loading: true }, onRefresh });
    expect(container.textContent).toContain('Carregando o salão...');
    expect(container.textContent).not.toContain('Nenhum pedido pronto para entrega.');
    expect(
      (container.querySelector('[aria-label="Atualizar dados do salão"]') as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    render({ workspaceState: { ...props.workspaceState!, error: 'A conexão falhou.' }, onRefresh });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('A conexão falhou.');
    expect(container.textContent).toContain('Os dados do salão ainda não estão disponíveis.');
    expect(container.textContent).not.toContain('Nenhum pedido pronto para entrega.');
    expect(container.textContent).not.toContain('Prontos para entregar0');
    const retry = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Tentar novamente',
    );
    act(() => retry?.click());
    expect(onRefresh).toHaveBeenCalledOnce();

    render({
      workspaceState: { ...props.workspaceState!, lastUpdatedAt: new Date().toISOString() },
      onRefresh,
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain('Nenhum pedido pronto para entrega.');
  });

  it('preserva pedidos carregados e indica atualização incompleta após falha de refresh', () => {
    render({
      initialView: 'deliveries',
      data: {
        ...props.data!,
        orders: [
          {
            id: '#14',
            channel: 'TABLE',
            reference: 'Mesa 07',
            customer: 'Cliente',
            items: ['1× Pizza'],
            createdAt: '18:31',
            elapsed: '08:30',
            status: 'PRONTO',
            total: 29,
          },
        ],
      },
      workspaceState: {
        ...props.workspaceState!,
        error: 'Não foi possível carregar pedidos.',
        lastUpdatedAt: new Date().toISOString(),
      },
    });
    expect(container.textContent).toContain('Pedido #14');
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Atualização incompleta');
    expect(container.textContent).not.toContain('Atualização automática');
    expect(container.textContent).not.toContain('Os dados do salão ainda não estão disponíveis.');
  });

  it('mantém o foco no menu móvel, fecha com Escape e devolve o foco ao botão de origem', () => {
    render();
    const trigger = container.querySelector(
      '[aria-label="Abrir opções do garçom"]',
    ) as HTMLButtonElement;
    trigger.focus();
    act(() => trigger.click());
    act(() => vi.advanceTimersByTime(20));

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const buttons = [...dialog.querySelectorAll('button')];
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(dialog.id);
    expect(document.activeElement).toBe(buttons[0]);
    expect(buttons[0].getAttribute('aria-label')).toBe('Fechar opções do garçom');
    expect(container.querySelector('main')?.hasAttribute('inert')).toBe(true);
    expect(
      container.querySelector('[aria-label="Navegação móvel do garçom"]')?.hasAttribute('inert'),
    ).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    act(() =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(document.activeElement).toBe(buttons.at(-1));
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
      ),
    );
    expect(document.activeElement).toBe(buttons[0]);
    act(() =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      ),
    );

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.body.style.overflow).toBe('');
    expect(container.querySelector('main')?.hasAttribute('inert')).toBe(false);
  });

  it('permite fechar as opções pelo botão visível', () => {
    render();
    const trigger = container.querySelector(
      '[aria-label="Abrir opções do garçom"]',
    ) as HTMLButtonElement;
    act(() => trigger.click());
    const close = container.querySelector(
      '[aria-label="Fechar opções do garçom"]',
    ) as HTMLButtonElement;
    act(() => close.click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
