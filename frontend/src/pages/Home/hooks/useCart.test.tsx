import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeStoredCart, useCart } from './useCart';
import type { HomeProduct } from '../types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const storedItem = { productId: '7', name: 'Pizza', price: 25, quantity: 2, image: 'pizza.png' };
const emptyProducts: HomeProduct[] = [];
const catalog: HomeProduct[] = [
  {
    id: '7',
    categoryId: '1',
    name: 'Pizza',
    description: '',
    price: 25,
    originalPrice: 25,
    image: 'pizza.png',
    rating: 5,
    available: true,
    stock: 5,
  },
];

describe('normalização do carrinho persistido', () => {
  it.each([null, undefined, {}, { length: 1 }, '[]', 7, true])(
    'rejeita raiz que não é lista: %j',
    (value) => {
      expect(normalizeStoredCart(value)).toEqual([]);
    },
  );

  it('preserva linhas válidas e compatibilidade com ingredientes e valores numéricos antigos', () => {
    const result = normalizeStoredCart([
      null,
      12,
      { ...storedItem, productId: 7, price: '25.50', quantity: '2', ingredientIds: ['bacon'] },
      { productId: 'bad' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      productId: '7',
      price: 25.5,
      quantity: 2,
      selectedOptionIds: ['bacon'],
      selectedOptions: [{ groupId: 'legacy-ingredients', optionIds: ['bacon'] }],
    });
    expect(result[0].cartId).toContain('7::');
    expect(result[0].cartId).toContain('bacon');
  });

  it.each([
    { price: 'Infinity' },
    { price: -1 },
    { quantity: 0 },
    { quantity: -1 },
    { quantity: 1.5 },
    { quantity: { toString: null } },
    { selectedOptions: {} },
    { selectedOptions: [null] },
    { selectedOptions: [{ groupId: 'group', optionIds: 'option' }] },
    { selectedOptionIds: [null] },
    { optionQuantities: [null] },
    { removedCompositionItemIds: {} },
    { portions: [null] },
    { ingredients: 'invalid' },
    { options: [{ id: 'x', name: {} }] },
    { observation: {} },
    { configurationVersion: { toString: null } },
  ])('descarta a linha malformada sem alterar outra linha: %j', (invalid) => {
    const result = normalizeStoredCart([
      { ...storedItem, ...invalid },
      { ...storedItem, productId: '8' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe('8');
  });
});

describe('useCart com storage inválido ou indisponível', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: ReturnType<typeof useCart>;
  const notify = vi.fn();
  function Harness({ restaurantId, products }: { restaurantId: number; products: HomeProduct[] }) {
    latest = useCart(products, notify, restaurantId);
    return (
      <output>
        {latest.cartCount}:{latest.cartTotal}
      </output>
    );
  }
  async function render(restaurantId = 7, products = emptyProducts) {
    await act(async () => {
      root.render(<Harness restaurantId={restaurantId} products={products} />);
    });
  }
  beforeEach(() => {
    localStorage.clear();
    notify.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it.each(['null', '{"length":1}', '"string"', '{broken-json'])(
    'não quebra com JSON persistido inválido: %s',
    async (raw) => {
      localStorage.setItem('cartItems:7', raw);
      await render();
      expect(latest.cart).toEqual([]);
      expect(container.textContent).toBe('0:0');
    },
  );

  it('restaura legado válido somente quando pertence ao mesmo restaurante', async () => {
    localStorage.setItem('cartItems:7', 'null');
    localStorage.setItem('cartItems', JSON.stringify([storedItem]));
    localStorage.setItem('cartRestaurantId', '8');
    await render();
    expect(latest.cart).toEqual([]);
    localStorage.setItem('cartItems', JSON.stringify([storedItem]));
    localStorage.setItem('cartRestaurantId', '8');
    await render(8);
    expect(latest.cartCount).toBe(2);
    expect(latest.cartTotal).toBe(50);
  });

  it('mantém o carrinho carregado e alterações em memória quando a gravação excede a quota', async () => {
    localStorage.setItem('cartItems:7', JSON.stringify([storedItem]));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    await render(7, catalog);
    expect(latest.cartCount).toBe(2);
    await act(async () => {
      latest.increaseCart(latest.cart[0].cartId!);
    });
    expect(latest.cartCount).toBe(3);
    expect(latest.cartTotal).toBe(75);
  });

  it('permite adicionar e remover em memória quando o acesso ao próprio localStorage é bloqueado', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    await render(7, catalog);
    await act(async () => {
      latest.addToCart('7', { selectedOptionIds: [], selectedOptions: [], observation: '' });
    });
    expect(latest.cartCount).toBe(1);
    expect(latest.cartTotal).toBe(25);
    await act(async () => {
      latest.decreaseCart(latest.cart[0].cartId!);
    });
    expect(latest.cart).toEqual([]);
  });
});
