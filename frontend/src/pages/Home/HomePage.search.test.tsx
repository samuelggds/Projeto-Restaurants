import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { homeMockData } from './data';
import { HomePage } from './HomePage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('busca de produtos na Home', () => {
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
    document.body
      .querySelectorAll('[data-testid="product-search-backdrop"]')
      .forEach((element) => element.remove());
  });

  it('abre pela lupa, encontra pelo nome e abre os detalhes do produto escolhido', () => {
    act(() =>
      root.render(
        <HomePage
          data={{
            ...homeMockData,
            brand: { ...homeMockData.brand, name: 'Restaurante Teste' },
            products: [
              {
                id: 'pizza-margherita',
                categoryId: 'pizzas',
                name: 'Pizza Margherita',
                description: 'Muçarela, tomate e manjericão',
                price: 49.9,
                originalPrice: 49.9,
                image: '/pizza.webp',
                rating: 4.8,
                available: true,
              },
            ],
          }}
        />,
      ),
    );

    const searchButton = container.querySelector(
      'button[aria-label="Buscar"]',
    ) as HTMLButtonElement;
    act(() => searchButton.click());

    const input = document.querySelector(
      'input[aria-label="Pesquisar produto pelo nome"]',
    ) as HTMLInputElement;
    expect(input).toBeTruthy();

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, 'margherita');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const result = document.querySelector(
      'button[aria-label="Ver Pizza Margherita"]',
    ) as HTMLButtonElement;
    expect(result).toBeTruthy();
    act(() => result.click());

    expect(document.querySelector('input[aria-label="Pesquisar produto pelo nome"]')).toBeNull();
    expect(
      document.querySelector('[role="dialog"][aria-label="Montar Pizza Margherita"]'),
    ).toBeTruthy();
  });
});
