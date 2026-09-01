import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminProduct } from '../types';
import { ProductDrawer } from './ProductDrawer';

vi.mock('../../../Services/productConfigurationTemplatesService', () => ({
  default: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    deactivate: vi.fn(),
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const configuredProduct: AdminProduct = {
  id: '70',
  categoryId: 9,
  category: 'Pizzas',
  name: 'Pizza da casa',
  description: 'Montada pelo cliente',
  image: '/pizza.webp',
  price: 40,
  stock: null,
  active: true,
  saleMode: 'BUILDABLE',
  configurationVersion: 3,
  optionGroups: [
    {
      id: 10,
      name: 'Tamanho',
      required: true,
      selectionType: 'SINGLE',
      minSelections: 1,
      maxSelections: 1,
      options: [{ id: 100, ingredientId: 20, pricingMode: 'ADDITIVE' }],
    },
  ],
  compositionItems: [],
  portionConfiguration: null,
};

describe('cadastro administrativo de produto', () => {
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

  it('exige confirmação antes de descartar uma configuração existente', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    await act(async () => {
      root.render(
        <ProductDrawer
          product={configuredProduct}
          categories={[{ id: 9, name: 'Pizzas', active: true }]}
          ingredients={[{ id: 20, name: 'Grande', price: 5, category: 'Tamanhos', active: true }]}
          close={vi.fn()}
          save={save}
        />,
      );
    });

    const simpleModeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Não, é um produto pronto'),
    ) as HTMLButtonElement;
    await act(async () => simpleModeButton.click());

    const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Salvar alterações'),
    ) as HTMLButtonElement;
    await act(async () => submitButton.click());

    expect(save).not.toHaveBeenCalled();
    expect(container.textContent).toContain(
      'Confirme a remoção da personalização antes de salvar como produto simples.',
    );

    const confirmation = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await act(async () => confirmation.click());
    await act(async () => submitButton.click());

    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0]).toMatchObject({
      id: '70',
      saleMode: 'COMPLETE',
      configurationVersion: 3,
      confirmDiscardConfiguration: true,
      optionGroups: [],
      compositionItems: [],
      portionConfiguration: null,
    });
  });
});
