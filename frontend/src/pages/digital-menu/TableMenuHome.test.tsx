import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeMockData } from '../Home/data';
import { TableMenuHome } from './TableMenuHome';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('TableMenuHome categories', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('destaca em laranja a categoria selecionada e atualiza aria-pressed', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <TableMenuHome
          data={{
            ...homeMockData,
            brand: {
              ...homeMockData.brand,
              name: 'North Pizza',
              primaryColor: '#e85a2b',
            },
            categories: [
              { id: 'lanches', name: 'Lanches', image: '' },
              { id: 'bebidas', name: 'Bebidas', image: '' },
              { id: 'combos', name: 'Combos', image: '' },
            ],
            products: [
              {
                id: 'featured-1',
                categoryId: 'lanches',
                name: 'Burger destaque',
                description: '',
                price: 20,
                originalPrice: 20,
                image: '',
                rating: 0,
                available: true,
                featured: true,
                kind: 'STANDARD',
                saleMode: 'COMPLETE',
              },
              {
                id: 'combo-1',
                categoryId: 'combos',
                name: 'Combo casal',
                description: '',
                price: 45,
                originalPrice: 45,
                image: '',
                rating: 0,
                available: true,
                kind: 'COMBO',
                saleMode: 'BUILDABLE',
                comboGroups: [],
              },
              {
                id: 'drink-1',
                categoryId: 'bebidas',
                name: 'Refrigerante',
                description: '',
                price: 8,
                originalPrice: 8,
                image: '',
                rating: 0,
                available: true,
                kind: 'STANDARD',
                saleMode: 'COMPLETE',
              },
            ],
          }}
          tableLabel="12"
          cartCount={0}
          waiterCallEnabled
          onOpenProduct={vi.fn()}
          onQuickAdd={vi.fn()}
          onOpenCart={vi.fn()}
          onCallWaiter={vi.fn()}
          onViewAccount={vi.fn()}
          onTrackOrder={vi.fn()}
        />,
      );
    });

    const categoryNav = container.querySelector(
      'nav[aria-label="Categorias do cardápio"]',
    ) as HTMLElement;
    expect(categoryNav).toBeTruthy();

    const button = (label: string) =>
      [...categoryNav.querySelectorAll('button')].find(
        (item) => item.textContent?.trim() === label,
      ) as HTMLButtonElement;

    const featured = button('Destaques');
    const combos = button('Combos');
    const drinks = button('Bebidas');

    expect(featured.getAttribute('aria-pressed')).toBe('true');
    expect(featured.classList.contains('active')).toBe(true);
    expect(combos.getAttribute('aria-pressed')).toBe('false');
    expect(drinks.getAttribute('aria-pressed')).toBe('false');

    await act(async () => combos.click());

    expect(featured.getAttribute('aria-pressed')).toBe('false');
    expect(combos.getAttribute('aria-pressed')).toBe('true');
    expect(combos.classList.contains('active')).toBe(true);

    await act(async () => drinks.click());

    expect(combos.getAttribute('aria-pressed')).toBe('false');
    expect(drinks.getAttribute('aria-pressed')).toBe('true');
    expect(drinks.classList.contains('active')).toBe(true);

    act(() => root.unmount());
    container.remove();
  });

  it('mantém acompanhar em tempo real na barra inferior da home da mesa', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onTrackOrder = vi.fn();

    await act(async () => {
      root.render(
        <TableMenuHome
          data={homeMockData}
          tableLabel="12"
          cartCount={1}
          waiterCallEnabled
          onOpenProduct={vi.fn()}
          onQuickAdd={vi.fn()}
          onOpenCart={vi.fn()}
          onCallWaiter={vi.fn()}
          onViewAccount={vi.fn()}
          onTrackOrder={onTrackOrder}
        />,
      );
    });

    const dock = container.querySelector('nav[aria-label="Ações da mesa"]') as HTMLElement;
    expect(dock).toBeTruthy();
    const tracking = [...dock.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.getAttribute('aria-label') === 'Acompanhar em tempo real',
    );
    expect(tracking).toBeTruthy();

    await act(async () => tracking?.click());
    expect(onTrackOrder).toHaveBeenCalledOnce();

    act(() => root.unmount());
    container.remove();
  });

});
