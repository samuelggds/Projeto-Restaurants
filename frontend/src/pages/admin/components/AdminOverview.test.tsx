import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminOrder, AdminProduct } from '../types';
import { AdminOverview } from './AdminOverview';
import { AppDialogProvider } from '../../../components/AppDialog/AppDialogProvider';
import type { RestaurantOrdersPageQuery } from '../../../Services/ordersService';
const mocks = vi.hoisted(() => ({ listPage: vi.fn(), overview: vi.fn() }));
vi.mock('../../../Services/ordersService', () => ({
  default: {
    listRestaurantOrdersPage: mocks.listPage,
    getOverview: mocks.overview,
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('AdminOverview', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.overview.mockResolvedValue({
      todayOrders: 61,
      sales: 625,
      averageTicket: 625 / 61,
      preparingOrders: 1,
      customers: 5,
      timezone: 'America/Sao_Paulo',
    });
    mocks.listPage.mockResolvedValue({ orders: [], total: 0, hasMore: false, nextCursor: null });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('expande páginas de pedidos e produtos sem calcular indicadores a partir da página', async () => {
    const orders: AdminOrder[] = Array.from({ length: 23 }, (_, index) => ({
      id: `#${index + 1}`,
      numericId: index + 1,
      customerName: `Cliente ${index + 1}`,
      status: 'PENDENTE',
      total: 20 + index,
    }));
    const products: AdminProduct[] = Array.from({ length: 12 }, (_, index) => ({
      id: String(index + 1),
      categoryId: 1,
      name: `Produto ${index + 1}`,
      category: 'Pizzas',
      price: 30 + index,
      image: '',
      active: true,
    }));

    mocks.listPage.mockImplementation(async ({ cursor }: RestaurantOrdersPageQuery) => {
      const start = cursor ? orders.findIndex((order) => order.numericId === cursor) + 1 : 0;
      const rows = orders.slice(start, start + 10);
      const hasMore = start + rows.length < orders.length;
      return {
        orders: rows.map((order) => ({ ...order, id: order.numericId })),
        total: orders.length,
        hasMore,
        nextCursor: hasMore ? rows.at(-1)!.numericId : null,
      };
    });
    await act(async () =>
      root.render(
        <AppDialogProvider>
          <AdminOverview
            orders={orders}
            products={products}
            restaurantName="Restaurante Teste"
            money={(value) => `R$ ${value}`}
            onNavigate={() => undefined}
          />
        </AppDialogProvider>,
      ),
    );

    expect(container.querySelectorAll('.data-row')).toHaveLength(20);
    expect(container.textContent).toContain('R$ 625');
    expect(container.textContent).toContain('61 pedidos hoje');

    const showMoreOrders = container.querySelector(
      'button[aria-label="Mostrar mais 10 pedidos recentes"]',
    ) as HTMLButtonElement;
    await act(async () => showMoreOrders.click());
    expect(container.querySelectorAll('.data-row')).toHaveLength(30);

    const showMoreProducts = container.querySelector(
      'button[aria-label="Mostrar mais 10 produtos"]',
    ) as HTMLButtonElement;
    act(() => showMoreProducts.click());
    expect(container.querySelectorAll('.data-row')).toHaveLength(32);

    const resetOrders = container.querySelector(
      'button[aria-label="Voltar aos 10 pedidos recentes iniciais"]',
    ) as HTMLButtonElement;
    await act(async () => resetOrders.click());
    expect(container.querySelectorAll('.data-row')).toHaveLength(22);

    const resetProducts = container.querySelector(
      'button[aria-label="Voltar aos 10 produtos iniciais"]',
    ) as HTMLButtonElement;
    act(() => resetProducts.click());
    expect(container.querySelectorAll('.data-row')).toHaveLength(20);
  });

  it('oferece atalhos contextuais para pedidos, cardápio e clientes', async () => {
    const onNavigate = vi.fn();

    await act(async () =>
      root.render(
        <AppDialogProvider>
          <AdminOverview
            orders={[]}
            products={[]}
            restaurantName="Restaurante Teste"
            money={(value) => `R$ ${value}`}
            onNavigate={onNavigate}
          />
        </AppDialogProvider>,
      ),
    );

    const click = (label: string) => {
      const button = Array.from(container.querySelectorAll('button')).find((item) =>
        item.textContent?.includes(label),
      );
      expect(button).toBeDefined();
      act(() => button?.click());
    };

    click('Acompanhar pedidos');
    click('Gerenciar cardápio');
    click('Ver clientes');

    expect(onNavigate.mock.calls).toEqual([['orders'], ['catalog'], ['customers']]);
  });

  it('permite cancelar um pedido FIFO na visão geral com confirmação e atualiza a lista', async () => {
    const order = {
      id: 801,
      customerName: 'Cliente na fila',
      status: 'PENDENTE',
      total: 40,
      paid: false,
      capacityQueuedAt: '2026-09-26T12:00:00Z',
    };
    mocks.listPage.mockResolvedValue({
      orders: [order],
      total: 1,
      hasMore: false,
      nextCursor: null,
    });
    const onCancelOrder = vi.fn().mockResolvedValue(undefined);
    await act(async () =>
      root.render(
        <AppDialogProvider>
          <AdminOverview
            orders={[]}
            products={[]}
            restaurantName="Restaurante Teste"
            money={(value) => `R$ ${value}`}
            onNavigate={vi.fn()}
            onCancelOrder={onCancelOrder}
          />
        </AppDialogProvider>,
      ),
    );

    expect(container.textContent).toContain('Aguardando vaga');
    const cancel = container.querySelector(
      'button[aria-label="Cancelar o pedido #801"]',
    ) as HTMLButtonElement;
    await act(async () => cancel.click());
    expect(onCancelOrder).not.toHaveBeenCalled();
    expect(container.textContent).toContain('retirado da fila de espera, sem iniciar o preparo');
    const confirm = container.querySelector(
      '[role="dialog"] button[type="submit"]',
    ) as HTMLButtonElement;
    mocks.listPage.mockResolvedValue({
      orders: [{ ...order, status: 'CANCELADO' }],
      total: 1,
      hasMore: false,
      nextCursor: null,
    });
    await act(async () => confirm.click());
    expect(onCancelOrder).toHaveBeenCalledExactlyOnceWith(801);
    expect(container.textContent).toContain('Cancelado');
    expect(container.textContent).not.toContain('Aguardando vaga');
    expect(container.querySelector('button[aria-label="Cancelar o pedido #801"]')).toBeNull();
  });
});
