import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KitchenProvider } from '../KitchenContext';
import type { EmployeeWorkspaceData, Order } from '../types';
import { KitchenHistoryPage, KitchenQueuePage } from './KitchenPages';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const employee = {
  id: '4',
  name: 'Ana Cozinha',
  email: 'ana@restaurant.test',
  role: 'KITCHEN' as const,
  shift: '18:00',
};
const restaurant = {
  restaurantName: 'Restaurante Teste',
  monogram: 'RT',
  primaryColor: '#d64d08',
};

function order(overrides: Partial<Order>): Order {
  return {
    id: '#1',
    channel: 'TABLE',
    reference: 'Mesa 4',
    items: ['1× Pizza'],
    itemDetails: [{ name: 'Pizza', quantity: 1, customizations: [] }],
    createdAt: '18:00',
    createdAtIso: '2026-08-24T18:00:00.000Z',
    elapsed: '02:00',
    status: 'PENDENTE',
    total: 40,
    ...overrides,
  };
}

const data: EmployeeWorkspaceData = {
  orders: [
    order({ id: '#2', reference: 'Mesa 2', createdAtIso: '2026-08-24T18:02:00.000Z' }),
    order({
      id: '#1',
      reference: 'Mesa 1',
      customer: 'Álvaro',
      createdAtIso: '2026-08-24T18:01:00.000Z',
      itemDetails: [
        {
          name: 'Pizza',
          quantity: 1,
          customizations: [{ groupName: 'Adicionais', options: ['Bacon crocante'] }],
        },
      ],
    }),
    order({
      id: '#3',
      channel: 'DELIVERY',
      reference: 'Delivery',
      customer: 'Bia',
      status: 'PREPARANDO',
      items: ['1× Lasanha'],
      itemDetails: [{ name: 'Lasanha', quantity: 1, customizations: [] }],
    }),
  ],
  tables: [],
  calls: [],
};

function changeInput(element: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(
    element,
    value,
  );
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('páginas operacionais da cozinha', () => {
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

  function renderPage(
    page: React.ReactNode,
    options: {
      currentData?: EmployeeWorkspaceData;
      onUpdateOrderStatus?: (id: string, status: Order['status']) => void | Promise<void>;
      onReprintOrder?: (id: string) => void | Promise<void>;
      onRefresh?: () => void | Promise<void>;
    } = {},
  ) {
    act(() =>
      root.render(
        <KitchenProvider
          employee={employee}
          restaurant={restaurant}
          data={options.currentData ?? data}
          onUpdateOrderStatus={options.onUpdateOrderStatus}
          onReprintOrder={options.onReprintOrder}
          onRefresh={options.onRefresh}
        >
          {page}
        </KitchenProvider>,
      ),
    );
  }

  it('mostra todos os canais, ordena os mais antigos primeiro e busca sem depender de acento', () => {
    renderPage(<KitchenQueuePage />);

    expect(container.querySelector('[data-order-id="#3"]')).not.toBeNull();
    const pendingIds = [...container.querySelectorAll('[data-order-id]')]
      .filter((element) => element.textContent?.includes('Pendente'))
      .map((element) => element.getAttribute('data-order-id'));
    expect(pendingIds).toEqual(['#1', '#2']);

    const search = container.querySelector(
      '[aria-label="Buscar pedidos da cozinha"]',
    ) as HTMLInputElement;
    act(() => changeInput(search, 'alvaro bacon'));

    expect(container.querySelector('[data-order-id="#1"]')).not.toBeNull();
    expect(container.querySelector('[data-order-id="#2"]')).toBeNull();
    expect(container.querySelector('[data-order-id="#3"]')).toBeNull();
  });

  it('bloqueia clique duplo durante a transição e mostra a rejeição do backend', async () => {
    let rejectUpdate: (reason?: unknown) => void = () => undefined;
    const pendingUpdate = new Promise<void>((_resolve, reject) => {
      rejectUpdate = reject;
    });
    const onUpdateOrderStatus = vi.fn(() => pendingUpdate);
    const onRefresh = vi.fn();
    renderPage(<KitchenQueuePage />, { onUpdateOrderStatus, onRefresh });

    const card = container.querySelector('[data-order-id="#1"]') as HTMLElement;
    const action = [...card.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Iniciar preparo'),
    ) as HTMLButtonElement;
    act(() => {
      action.click();
      action.click();
    });

    expect(onUpdateOrderStatus).toHaveBeenCalledTimes(1);
    expect(action.disabled).toBe(true);
    expect(action.textContent).toContain('Atualizando');

    await act(async () => {
      rejectUpdate(new Error('Pedido já foi atualizado por outra estação.'));
      await pendingUpdate.catch(() => undefined);
    });

    expect(card.textContent).toContain('Pedido já foi atualizado por outra estação.');
    const refresh = [...card.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Atualizar fila',
    );
    act(() => refresh?.click());
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('impede preparo de pedido sem produto e sinaliza o dado inválido', () => {
    const invalidOrder = order({ id: '#9', items: [], itemDetails: [] });
    renderPage(<KitchenQueuePage />, {
      currentData: { ...data, orders: [invalidOrder] },
      onUpdateOrderStatus: vi.fn(),
    });

    const card = container.querySelector('[data-order-id="#9"]') as HTMLElement;
    expect(card.textContent).toContain('Itens do pedido não informados.');
    expect(card.textContent).toContain('Este pedido chegou sem itens.');
    expect((card.querySelector('.action') as HTMLButtonElement).disabled).toBe(true);
  });

  it('solicita uma única reimpressão manual e mostra falhas do backend', async () => {
    const request = deferred<void>();
    const onReprintOrder = vi.fn(() => request.promise);
    renderPage(<KitchenQueuePage />, { onReprintOrder });

    const card = container.querySelector('[data-order-id="#1"]') as HTMLElement;
    const reprint = [...card.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Reimprimir comanda'),
    ) as HTMLButtonElement;
    act(() => {
      reprint.click();
      reprint.click();
    });

    expect(onReprintOrder).toHaveBeenCalledTimes(1);
    expect(onReprintOrder).toHaveBeenCalledWith('#1');
    expect(reprint.disabled).toBe(true);

    await act(async () => {
      request.reject(new Error('Ative a impressão da cozinha antes de solicitar uma reimpressão.'));
      await request.promise.catch(() => undefined);
    });
    expect(card.textContent).toContain('Ative a impressão da cozinha');
  });

  it('calcula o histórico com timestamps reais e mantém itens básicos consultáveis', () => {
    const now = new Date();
    const startedAt = new Date(now.getTime() - 20 * 60_000).toISOString();
    const readyAt = new Date(now.getTime() - 10 * 60_000).toISOString();
    const historyData: EmployeeWorkspaceData = {
      ...data,
      orders: [
        order({
          id: '#10',
          status: 'ENTREGUE',
          preparationStartedAt: startedAt,
          readyAt,
          completedAtIso: now.toISOString(),
          completedAt: '18:30',
          items: ['1× Pizza histórica'],
          itemDetails: [{ name: 'Pizza histórica', quantity: 1, customizations: [] }],
        }),
      ],
    };
    renderPage(<KitchenHistoryPage />, { currentData: historyData });

    expect(container.textContent).toContain('Concluídos hoje1');
    expect(container.textContent).toContain('Tempo médio10 min');
    expect(container.textContent).not.toContain('18 min');
    const details = container.querySelector('details') as HTMLDetailsElement;
    expect(details).not.toBeNull();
    act(() => {
      details.open = true;
      details.dispatchEvent(new Event('toggle', { bubbles: true }));
    });
    expect(details.textContent).toContain('Pizza histórica');
  });

  it('pagina o histórico em blocos de 10 e volta à primeira página ao pesquisar', () => {
    const historyOrders = Array.from({ length: 12 }, (_, index) =>
      order({
        id: `#${index + 1}`,
        status: 'ENTREGUE',
        completedAt: `18:${String(index).padStart(2, '0')}`,
        completedAtIso: new Date(2026, 7, 24, 18, index).toISOString(),
      }),
    );
    renderPage(<KitchenHistoryPage />, {
      currentData: { ...data, orders: historyOrders },
    });

    const visibleIds = () =>
      [...container.querySelectorAll('.history-order .row b')].map(
        (element) => element.textContent,
      );

    expect(container.textContent).toContain('Mostrando 1–10 de 12 pedidos');
    expect(visibleIds()).toEqual(['#12', '#11', '#10', '#9', '#8', '#7', '#6', '#5', '#4', '#3']);

    const next = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Próximos 10',
    ) as HTMLButtonElement;
    act(() => next.click());

    expect(container.textContent).toContain('Mostrando 11–12 de 12 pedidos');
    expect(visibleIds()).toEqual(['#2', '#1']);

    const search = container.querySelector(
      '[aria-label="Buscar no histórico da cozinha"]',
    ) as HTMLInputElement;
    act(() => changeInput(search, '#12'));

    expect(container.textContent).toContain('Mostrando 1–1 de 1 pedidos');
    expect(container.textContent).toContain('#12');
  });
});
