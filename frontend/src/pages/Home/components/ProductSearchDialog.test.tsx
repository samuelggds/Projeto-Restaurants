import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeProduct } from '../types';
import { ProductSearchDialog } from './ProductSearchDialog';

const products: HomeProduct[] = [
  {
    id: 'pizza-portuguesa',
    categoryId: 'pizzas',
    name: 'Pizza Portuguesa',
    description: 'Presunto, ovos e cebola',
    price: 49.9,
    originalPrice: 59.9,
    image: '/pizza-portuguesa.webp',
    rating: 4.8,
    available: true,
  },
  {
    id: 'acai',
    categoryId: 'sobremesas',
    name: 'Açaí especial',
    description: 'Açaí com frutas e granola',
    price: 24,
    originalPrice: 24,
    image: '/acai.webp',
    rating: 4.7,
    available: true,
  },
];

describe('ProductSearchDialog', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    document.body.innerHTML = '';
  });

  const renderDialog = (
    overrides: Partial<React.ComponentProps<typeof ProductSearchDialog>> = {},
  ) => {
    const props = {
      open: true,
      products,
      primaryColor: '#d64d08',
      onClose: vi.fn(),
      onSelect: vi.fn(),
      ...overrides,
    };

    act(() => root.render(<ProductSearchDialog {...props} />));
    return props;
  };

  const searchFor = (value: string) => {
    const input = document.querySelector(
      'input[aria-label="Pesquisar produto pelo nome"]',
    ) as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    return input;
  };

  it('filtra por nome sem diferenciar maiúsculas ou acentos', () => {
    renderDialog();

    const input = searchFor('ACAI');

    expect(input).toBe(document.activeElement);
    expect(document.body.textContent).toContain('Açaí especial');
    expect(document.body.textContent).not.toContain('Pizza Portuguesa');
  });

  it('mostra orientação inicial e estado vazio quando não encontra produtos', () => {
    renderDialog();
    expect(document.body.textContent).toContain('Sugestões do cardápio');
    expect(document.body.textContent).toContain('Pizza Portuguesa');

    searchFor('produto inexistente');

    expect(document.body.textContent).toContain('Nenhum produto encontrado');
  });

  it('seleciona o produto por clique e pela tecla Enter', () => {
    const onSelect = vi.fn();
    renderDialog({ onSelect });
    searchFor('pizza');

    const result = document.querySelector(
      'button[aria-label="Ver Pizza Portuguesa"]',
    ) as HTMLButtonElement;
    act(() => result.click());
    expect(onSelect).toHaveBeenLastCalledWith(products[0]);

    act(() => result.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith(products[0]);
  });

  it('fecha ao pressionar Escape', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });

    act(() =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
