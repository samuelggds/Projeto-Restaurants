import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminProduct } from '../types';
import { ProductDrawer } from './ProductDrawer';

const confirmDialog = vi.fn().mockResolvedValue(true);

vi.mock('../../../components/AppDialog/context', () => ({
  useAppDialog: () => ({ confirmDialog }),
}));

vi.mock('../../../Services/productConfigurationTemplatesService', () => ({
  default: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    deactivate: vi.fn(),
  },
}));

vi.mock('../../../Services/ingredientsService', () => ({
  default: {
    searchImages: vi.fn().mockResolvedValue({ results: [], page: 1 }),
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

  const clickButton = async (text: string) => {
    const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes(text),
    ) as HTMLButtonElement | undefined;
    expect(button, `Botão “${text}” não encontrado`).toBeTruthy();
    await act(async () => button?.click());
  };

  const clickIngredientWizardButton = async (text: string) => {
    const wizard = document.querySelector('[data-ingredient-wizard]');
    const button = Array.from(wizard?.querySelectorAll('button') ?? []).find((candidate) =>
      candidate.textContent?.includes(text),
    ) as HTMLButtonElement | undefined;
    expect(button, `Botão “${text}” do ingrediente não encontrado`).toBeTruthy();
    await act(async () => button?.click());
  };

  const fillIngredientWizardInput = async (selector: string, value: string) => {
    const field = document.querySelector(
      `[data-ingredient-wizard] ${selector}`,
    ) as HTMLInputElement | null;
    expect(field, `Campo “${selector}” do ingrediente não encontrado`).toBeTruthy();
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setValue?.call(field, value);
      field?.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  const advanceReadyMadeProductToReview = async () => {
    await clickButton('Continuar');
    await clickButton('Continuar');
    await clickButton('Continuar');
    await clickButton('Continuar');
    await clickButton('Continuar');
  };

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

    await clickButton('Produto pronto');
    await advanceReadyMadeProductToReview();
    await clickButton('Salvar alterações');

    expect(save).not.toHaveBeenCalled();
    expect(container.textContent).toContain(
      'Confirme a remoção da personalização antes de salvar como produto simples.',
    );

    const confirmation = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await act(async () => confirmation.click());
    await advanceReadyMadeProductToReview();
    await clickButton('Salvar alterações');

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

  it('preserva o produto ao criar uma opção inline na personalização', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    let currentIngredients = [
      { id: 20, name: 'Grande', price: 5, category: 'Tamanhos', active: true },
      { id: 30, name: 'Bacon', price: 4, category: 'Adicionais', active: true },
    ];
    let renderDrawer = () => undefined;
    const createIngredient = vi.fn(
      async (draft: Omit<(typeof currentIngredients)[number], 'id'>) => {
        const created = { id: 30 + createIngredient.mock.calls.length, ...draft };
        currentIngredients = [...currentIngredients, created];
        renderDrawer();
        return created;
      },
    );
    renderDrawer = () => {
      root.render(
        <ProductDrawer
          product={configuredProduct}
          categories={[{ id: 9, name: 'Pizzas', active: true }]}
          ingredients={currentIngredients}
          createIngredient={createIngredient}
          close={vi.fn()}
          save={save}
        />,
      );
    };
    await act(async () => renderDrawer());

    await clickButton('Continuar');
    await clickButton('Continuar');
    await clickButton('Continuar');
    await clickButton('Continuar');
    await clickButton('Cadastrar novo ingrediente');
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(document.querySelector('[data-ingredient-wizard]')).toBeNull();
    expect(container.textContent).toContain('Como o cliente poderá personalizar?');
    await clickButton('Cadastrar novo ingrediente');
    await fillIngredientWizardInput('input[placeholder="Ex.: Bacon"]', 'Pequeno');
    await clickIngredientWizardButton('Continuar');
    await clickIngredientWizardButton('Continuar sem foto');
    await clickIngredientWizardButton('Continuar');
    await clickIngredientWizardButton('Concluir');

    expect(container.textContent).toContain('2 opção(ões)');
    await clickButton('Continuar');
    await clickButton('Continuar');
    await clickButton('Salvar alterações');

    expect(createIngredient).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0]).toMatchObject({
      compositionItems: [],
      optionGroups: [
        {
          name: 'Tamanho',
          options: expect.arrayContaining([
            expect.objectContaining({ ingredientId: 20 }),
            expect.objectContaining({ ingredientId: 31, additionalPrice: 0 }),
          ]),
        },
      ],
    });
  });
});
