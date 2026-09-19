import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import productComboService, { type ComboRecord } from '../../../Services/productComboService';
import type { AdminProduct } from '../types';
import { AdminCombos } from './AdminCombos';

vi.mock('../../../Services/productComboService', () => ({
  default: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    generatePreviewImage: vi.fn(),
  },
}));

vi.mock('../../../Services/imageEnhancementService', () => ({
  default: { enhanceComboImage: vi.fn() },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const products: AdminProduct[] = [
  {
    id: '11',
    categoryId: 1,
    category: 'Lanches',
    name: 'Burger da casa',
    price: 25,
    image: '',
    active: true,
  },
  {
    id: '12',
    categoryId: 2,
    category: 'Bebidas',
    name: 'Refrigerante',
    price: 6,
    image: '',
    active: true,
  },
  {
    id: '13',
    categoryId: 1,
    category: 'Lanches',
    name: 'Batata indisponível',
    price: 12,
    image: '',
    active: false,
  },
];

const combo: ComboRecord = {
  id: 70,
  kind: 'COMBO',
  configurationVersion: 3,
  name: 'Combo com escolhas',
  description: 'Escolha seus acompanhamentos.',
  image: '',
  price: 50,
  active: true,
  featured: false,
  groups: [],
  comboGroups: [
    {
      id: 100,
      name: 'Lanches e acompanhamentos',
      description: 'Escolha até dois produtos.',
      minSelections: 1,
      maxSelections: 2,
      active: true,
      options: [
        {
          id: 1000,
          componentProductId: 11,
          additionalPrice: 4.25,
          minQuantity: 1,
          maxQuantity: 3,
          defaultQuantity: 2,
          locked: false,
          active: true,
          componentProduct: { id: 11, name: 'Burger da casa', price: 25, active: true },
        },
        {
          id: 1001,
          componentProductId: 13,
          additionalPrice: 2.5,
          minQuantity: 0,
          maxQuantity: 2,
          defaultQuantity: 0,
          locked: false,
          active: false,
          componentProduct: { id: 13, name: 'Batata indisponível', price: 12, active: false },
        },
      ],
    },
    {
      id: 101,
      name: 'Bebidas antigas',
      description: 'Etapa temporariamente desativada.',
      minSelections: 0,
      maxSelections: 1,
      active: false,
      options: [
        {
          id: 1002,
          componentProductId: 19,
          additionalPrice: 1.75,
          minQuantity: 1,
          maxQuantity: 1,
          defaultQuantity: 1,
          locked: true,
          active: false,
          componentProduct: { id: 19, name: 'Suco antigo', price: 8, active: false },
        },
      ],
    },
  ],
};

describe('editor administrativo de combos', () => {
  let container: HTMLDivElement;
  let root: Root;
  let originalOverflow: string;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(productComboService.list).mockResolvedValue([]);
    vi.mocked(productComboService.create).mockResolvedValue(combo);
    vi.mocked(productComboService.update).mockResolvedValue(combo);
    originalOverflow = document.body.style.overflow;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.style.overflow = originalOverflow;
  });

  const renderCombos = async (onChanged = vi.fn().mockResolvedValue(undefined)) => {
    await act(async () => {
      root.render(
        <AdminCombos products={products} money={(value) => `R$ ${value}`} onChanged={onChanged} />,
      );
    });
  };

  const dialog = () => {
    const editor = document.querySelector<HTMLElement>('[role="dialog"]');
    expect(editor).not.toBeNull();
    return editor!;
  };

  const button = (name: string, scope: ParentNode = document) => {
    const result = Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) =>
        candidate.getAttribute('aria-label') === name || candidate.textContent?.trim() === name,
    );
    expect(result, `Botão “${name}” não encontrado`).toBeTruthy();
    return result!;
  };

  const click = async (name: string, scope: ParentNode = document) => {
    await act(async () => button(name, scope).click());
  };

  const input = (name: string) => {
    const result = Array.from(dialog().querySelectorAll<HTMLInputElement>('input')).find(
      (candidate) =>
        candidate.getAttribute('aria-label') === name ||
        candidate.closest('label')?.textContent?.includes(name),
    );
    expect(result, `Campo “${name}” não encontrado`).toBeTruthy();
    return result!;
  };

  const fill = async (name: string, value: string) => {
    const field = input(name);
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
      setValue.call(field, value);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  const addProduct = async (id: string) => {
    const selector = dialog().querySelector<HTMLSelectElement>('select')!;
    await act(async () => {
      selector.value = id;
      selector.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await click('Adicionar ao combo', dialog());
  };

  const prepareNewCombo = async () => {
    await click('Novo combo', container);
    await fill('Nome do combo', 'Combo Casal');
    await fill('Preço final do combo', '59.90');
    await addProduct('11');
  };

  it('abre fora do workspace, foca o nome e restaura foco e rolagem ao fechar com Escape', async () => {
    document.body.style.overflow = 'scroll';
    await renderCombos();
    const opener = button('Novo combo', container);
    opener.focus();
    await click('Novo combo', container);

    expect(container.contains(dialog())).toBe(false);
    expect(document.body.contains(dialog())).toBe(true);
    expect(document.activeElement).toBe(input('Nome do combo'));
    expect(document.body.style.overflow).toBe('hidden');

    await act(async () => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('preserva grupos, preços adicionais, quantidades e opções inativas ao editar apenas o nome', async () => {
    vi.mocked(productComboService.list).mockResolvedValue([combo]);
    await renderCombos();
    await click('Editar combo', container);
    await fill('Nome do combo', 'Combo revisado');
    await click('Salvar combo', dialog());

    expect(productComboService.update).toHaveBeenCalledExactlyOnceWith(70, {
      name: 'Combo revisado',
      description: combo.description,
      image: '',
      price: 50,
      active: true,
      featured: false,
      groups: combo.comboGroups.map(({ id: _id, options, ...group }) => ({
        ...group,
        options: options.map(({ id: _optionId, componentProduct: _product, ...option }) => option),
      })),
    });
    expect(productComboService.create).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it.each(['onChanged', 'list'] as const)(
    'fecha o editor e mantém aviso visível se %s falhar depois da criação',
    async (failure) => {
      const onChanged = vi.fn().mockResolvedValue(undefined);
      if (failure === 'onChanged') onChanged.mockRejectedValue(new Error('Falha na atualização'));
      if (failure === 'list') {
        vi.mocked(productComboService.list)
          .mockResolvedValueOnce([])
          .mockRejectedValueOnce(new Error('Falha na atualização'));
      }
      await renderCombos(onChanged);
      await prepareNewCombo();
      await click('Salvar combo', dialog());

      expect(productComboService.create).toHaveBeenCalledOnce();
      expect(onChanged).toHaveBeenCalledOnce();
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      const feedback = container.querySelector('[role="status"], [role="alert"]');
      expect(feedback?.textContent).toMatch(/salvo|criado/i);
      expect(feedback?.textContent).toMatch(/atualiz|recarreg/i);
      expect(
        Array.from(document.querySelectorAll('button')).some(
          (candidate) => candidate.textContent === 'Salvar combo',
        ),
      ).toBe(false);
    },
  );

  it('mostra e permite remover vínculos inativos ou ausentes do catálogo sem apagar as outras regras', async () => {
    vi.mocked(productComboService.list).mockResolvedValue([combo]);
    await renderCombos();
    await click('Editar combo', container);

    expect(dialog().textContent).toContain('Batata indisponível');
    expect(dialog().textContent).toContain('Suco antigo');
    await click('Remover Batata indisponível do combo', dialog());
    await click('Remover Suco antigo do combo', dialog());
    expect(
      dialog().querySelector('[aria-label="Remover Batata indisponível do combo"]'),
    ).toBeNull();
    expect(dialog().querySelector('[aria-label="Remover Suco antigo do combo"]')).toBeNull();
    await click('Salvar combo', dialog());

    expect(productComboService.update).toHaveBeenCalledOnce();
    const payload = vi.mocked(productComboService.update).mock.calls[0][1];
    expect(payload.groups.flatMap((group) => group.options)).toEqual([
      {
        componentProductId: 11,
        additionalPrice: 4.25,
        minQuantity: 1,
        maxQuantity: 3,
        defaultQuantity: 2,
        locked: false,
        active: true,
      },
    ]);
    expect(payload.groups[0]).toMatchObject({
      name: 'Lanches e acompanhamentos',
      minSelections: 1,
      active: true,
    });
  });

  it.each([
    ['Nome do combo', ' a '],
    ['Preço final do combo', '0'],
    ['Preço final do combo', '-5'],
    ['Preço final do combo', '1000001'],
  ])('recusa %s inválido: %s', async (name, value) => {
    await renderCombos();
    await prepareNewCombo();
    await fill(name, value);
    await click('Salvar combo', dialog());

    expect(productComboService.create).not.toHaveBeenCalled();
    expect(dialog().querySelector('[role="status"], [role="alert"]')?.textContent).toBeTruthy();
  });

  it('salva quantidade fixa por produto sem contar unidades como seleções distintas', async () => {
    await renderCombos();
    await prepareNewCombo();
    await fill('Nome do combo', '  Combo Casal  ');
    await fill('Preço final do combo', '1000000');
    await addProduct('12');
    await fill('Quantidade de Burger da casa', '2');
    await fill('Quantidade de Refrigerante', '20');
    await click('Salvar combo', dialog());

    expect(productComboService.create).toHaveBeenCalledOnce();
    const payload = vi.mocked(productComboService.create).mock.calls[0][0];
    expect(payload).toMatchObject({ name: 'Combo Casal', price: 1000000 });
    expect(payload.groups).toEqual([
      expect.objectContaining({
        minSelections: 2,
        maxSelections: 2,
        options: [
          expect.objectContaining({
            componentProductId: 11,
            minQuantity: 2,
            maxQuantity: 2,
            defaultQuantity: 2,
            locked: true,
          }),
          expect.objectContaining({
            componentProductId: 12,
            minQuantity: 20,
            maxQuantity: 20,
            defaultQuantity: 20,
            locked: true,
          }),
        ],
      }),
    ]);
  });

  it('exige ao menos um produto antes de criar o combo', async () => {
    await renderCombos();
    await click('Novo combo', container);
    await fill('Nome do combo', 'Combo vazio');
    await fill('Preço final do combo', '59.90');
    await click('Salvar combo', dialog());

    expect(productComboService.create).not.toHaveBeenCalled();
    expect(dialog().querySelector('[role="status"], [role="alert"]')?.textContent).toMatch(
      /produto/i,
    );
  });

  it.each(['0', '21', '1.5'])('recusa quantidade fixa inválida: %s', async (quantity) => {
    await renderCombos();
    await prepareNewCombo();
    await fill('Quantidade de Burger da casa', quantity);
    await click('Salvar combo', dialog());

    expect(productComboService.create).not.toHaveBeenCalled();
    expect(dialog().querySelector('[role="status"], [role="alert"]')?.textContent).toBeTruthy();
  });
});
