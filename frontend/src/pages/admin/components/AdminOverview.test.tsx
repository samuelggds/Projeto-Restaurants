import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminOrder, AdminProduct } from '../types';
import { AdminOverview } from './AdminOverview';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('AdminOverview', () => {
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

  it('expande pedidos e produtos em blocos independentes de 10', () => {
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

    act(() =>
      root.render(
        <AdminOverview
          orders={orders}
          products={products}
          restaurantName="Restaurante Teste"
          money={(value) => `R$ ${value}`}
          onNavigate={() => undefined}
        />,
      ),
    );

    expect(container.querySelectorAll('.data-row')).toHaveLength(20);

    const showMoreOrders = container.querySelector(
      'button[aria-label="Mostrar mais 10 pedidos recentes"]',
    ) as HTMLButtonElement;
    act(() => showMoreOrders.click());
    expect(container.querySelectorAll('.data-row')).toHaveLength(30);

    const showMoreProducts = container.querySelector(
      'button[aria-label="Mostrar mais 10 produtos"]',
    ) as HTMLButtonElement;
    act(() => showMoreProducts.click());
    expect(container.querySelectorAll('.data-row')).toHaveLength(32);

    const resetOrders = container.querySelector(
      'button[aria-label="Voltar aos 10 pedidos recentes iniciais"]',
    ) as HTMLButtonElement;
    act(() => resetOrders.click());
    expect(container.querySelectorAll('.data-row')).toHaveLength(22);

    const resetProducts = container.querySelector(
      'button[aria-label="Voltar aos 10 produtos iniciais"]',
    ) as HTMLButtonElement;
    act(() => resetProducts.click());
    expect(container.querySelectorAll('.data-row')).toHaveLength(20);
  });

  it('oferece atalhos contextuais para pedidos, cardápio e clientes', () => {
    const onNavigate = vi.fn();

    act(() =>
      root.render(
        <AdminOverview
          orders={[]}
          products={[]}
          restaurantName="Restaurante Teste"
          money={(value) => `R$ ${value}`}
          onNavigate={onNavigate}
        />,
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
});
