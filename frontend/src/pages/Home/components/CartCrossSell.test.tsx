import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { HomeProduct } from '../types';
import { CartCrossSell } from './CartCrossSell';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const product = (id: string, categoryId: string): HomeProduct => ({
  id,
  categoryId,
  name: 'Produto ' + id,
  description: '',
  price: 12,
  originalPrice: 12,
  image: '',
  rating: 0,
  available: true,
});

describe('CartCrossSell', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('troca a categoria e permite adicionar pelo fluxo existente', async () => {
    const onAdd = vi.fn();
    const drink = product('suco', 'Bebidas');
    const side = product('batata', 'Acompanhamentos');
    await act(async () => root.render(<CartCrossSell products={[side, drink]} onAdd={onAdd} />));
    expect(container.querySelector('[aria-label="Adicionar Produto batata"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Adicionar Produto suco"]')).toBeNull();

    const tab = Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'))
      .find((button) => button.textContent?.includes('Bebidas'));
    await act(async () => tab?.click());
    const add = container.querySelector<HTMLButtonElement>('[aria-label="Adicionar Produto suco"]');
    expect(add).not.toBeNull();
    await act(async () => add?.click());
    expect(onAdd).toHaveBeenCalledOnce();
    expect(onAdd.mock.calls[0][0]).toBe(drink);
  });

  it('exibe quatro por padrão e amplia a categoria ao tocar em Ver todos', async () => {
    const items = Array.from({ length: 5 }, (_, i) => product(String(i), 'Acompanhamentos'));
    await act(async () => root.render(<CartCrossSell products={items} onAdd={vi.fn()} />));
    expect(container.querySelectorAll('[data-cross-sell-card]')).toHaveLength(4);
    const button = Array.from(container.querySelectorAll('button'))
      .find((entry) => entry.textContent?.includes('Ver todos'));
    await act(async () => button?.click());
    expect(container.querySelectorAll('[data-cross-sell-card]')).toHaveLength(5);
  });

  it('não renderiza a seção quando não há produtos', async () => {
    await act(async () => root.render(<CartCrossSell products={[]} onAdd={vi.fn()} />));
    expect(container.innerHTML).toBe('');
  });
});
