import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ProductConfigurator } from './ProductConfigurator';
import {
  productConfigurationTotal,
  validatePortionSelections,
  type ProductOptionGroup,
} from '../domain/productCustomization';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const group = (id: string, prices: number[]): ProductOptionGroup => ({
  id,
  name: `Metade ${id}`,
  required: true,
  selectionType: 'SINGLE',
  minSelections: 1,
  maxSelections: 1,
  options: prices.map((price, index) => ({
    id: `${id}-${index}`,
    referenceProductId: `${id}-${index}`,
    name: `Sabor ${id}-${index}`,
    active: true,
    price,
    absolutePrice: price,
    pricingMode: 'ABSOLUTE',
  })),
});
const groups = [group('1', [35, 50]), group('2', [42])];

describe('preço dinâmico no meio a meio', () => {
  it('substitui o preço inicial pelo maior escolhido, inclusive ao trocar para opção mais barata', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const onConfirm = vi.fn();
    try {
      await act(async () =>
        root.render(
          <ProductConfigurator
            product={{
              id: '70',
              name: 'Meio a meio',
              image: '',
              description: '',
              price: 29.9,
              pricingMode: 'HIGHEST_OPTION',
              optionGroups: groups,
            }}
            onClose={vi.fn()}
            onConfirm={onConfirm}
          />,
        ),
      );
      const dialog = document.querySelector('[data-testid="product-configurator"]')!;
      const footer = () => dialog.querySelector('[data-testid="product-configurator-footer"]')!;
      expect(dialog.textContent).not.toContain('29,90');
      expect(footer().textContent).not.toContain('0,00');
      expect(footer().textContent).toContain('Escolha os sabores');
      const choose = async (id: string) =>
        act(async () => (dialog.querySelector(`input[value="${id}"]`) as HTMLInputElement).click());
      await choose('1-1');
      await choose('2-0');
      expect(footer().textContent).toContain('50,00');
      await choose('1-0');
      expect(footer().textContent).toContain('42,00');
      await act(async () => (footer().querySelector('button') as HTMLButtonElement).click());
      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ selectedOptionIds: ['1-0', '2-0'] }),
      );
      expect(onConfirm.mock.calls[0][0]).not.toHaveProperty('price');
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('não soma a base ao maior sabor e cobra adicionais uma única vez', () => {
    const extra: ProductOptionGroup = {
      id: 'extras',
      name: 'Borda',
      required: false,
      selectionType: 'MULTIPLE',
      minSelections: 0,
      maxSelections: 1,
      options: [{ id: 'borda', name: 'Borda', price: 6, active: true, pricingMode: 'ADDITIVE' }],
    };
    expect(productConfigurationTotal(29.9, groups, {}, { pricingMode: 'HIGHEST_OPTION' })).toBe(0);
    expect(
      productConfigurationTotal(
        29.9,
        [...groups, extra],
        { '1': ['1-0'], '2': ['2-0'], extras: ['borda'] },
        { pricingMode: 'HIGHEST_OPTION' },
      ),
    ).toBe(48);
    expect(productConfigurationTotal(29.9, [extra], {}, { pricingMode: 'BASE' })).toBe(29.9);
  });
});


describe('layout de produto personalizado do cliente', () => {
  it('renderiza estrutura de personalização com imagem, grupos, adicionais, observação e CTA Continuar', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onConfirm = vi.fn();

    try {
      await act(async () =>
        root.render(
          <ProductConfigurator
            product={{
              id: 'smash-bacon',
              name: 'Smash Bacon',
              description: 'Blend smash com cheddar, bacon e maionese.',
              image: '/smash-bacon.webp',
              price: 28.9,
              optionGroups: [
                {
                  id: 'ponto',
                  name: 'Ponto da carne',
                  required: true,
                  selectionType: 'SINGLE',
                  minSelections: 1,
                  maxSelections: 1,
                  options: [
                    { id: 'ao-ponto', name: 'Ao ponto', price: 0, active: true },
                    { id: 'bem-passado', name: 'Bem passado', price: 0, active: true },
                    { id: 'mal-passado', name: 'Mal passado', price: 0, active: true },
                  ],
                },
                {
                  id: 'extras',
                  name: 'Adicionais',
                  required: false,
                  selectionType: 'MULTIPLE',
                  minSelections: 0,
                  maxSelections: 3,
                  options: [
                    {
                      id: 'bacon-extra',
                      name: 'Bacon extra',
                      image: '/bacon.webp',
                      price: 4.9,
                      active: true,
                    },
                    {
                      id: 'cheddar-extra',
                      name: 'Cheddar extra',
                      image: '/cheddar.webp',
                      price: 4,
                      active: true,
                    },
                  ],
                },
              ],
            }}
            customerPageVariant
            enableProductQuantity
            embedded
            onClose={vi.fn()}
            onConfirm={onConfirm}
          />,
        ),
      );

      const dialog = container.querySelector('[data-testid="product-configurator"]') as HTMLElement;
      expect(dialog).toBeTruthy();
      expect(dialog.textContent).toContain('Smash Bacon');
      expect(dialog.textContent).toContain('Ponto da carne');
      expect(dialog.textContent).toContain('Adicionais');
      expect(dialog.textContent).toContain('Alguma observação?');
      expect(dialog.textContent).toContain('Continuar');
      expect(
        dialog.querySelector('textarea')?.getAttribute('placeholder'),
      ).toBe('Ex: sem cebola, maionese à parte...');
      expect(dialog.querySelector('img[src="/smash-bacon.webp"]')).toBeTruthy();
      expect(dialog.querySelector('img[src="/bacon.webp"]')).toBeTruthy();

      await act(async () => {
        (dialog.querySelector('input[value="ao-ponto"]') as HTMLInputElement).click();
        (dialog.querySelector('input[value="bacon-extra"]') as HTMLInputElement).click();
      });

      await act(async () => {
        (dialog.querySelector('button[type="submit"]') as HTMLButtonElement).click();
      });

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedOptionIds: expect.arrayContaining(['ao-ponto', 'bacon-extra']),
        }),
        1,
      );
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});


describe('pizza meio a meio', () => {
  const portionConfiguration = {
    enabled: true,
    optionGroupId: 'sabores',
    minPortions: 2,
    maxPortions: 2,
    pricingStrategy: 'HIGHEST' as const,
    allowPortionObservations: false,
  };

  it('valida que as duas metades são obrigatórias', () => {
    expect(validatePortionSelections(portionConfiguration, [{ optionId: '' }, { optionId: '' }]))
      .toBe('Escolha o sabor da 1ª parte.');
    expect(
      validatePortionSelections(portionConfiguration, [
        { optionId: 'calabresa' },
        { optionId: '' },
      ]),
    ).toBe('Escolha o sabor da 2ª parte.');
    expect(
      validatePortionSelections(portionConfiguration, [
        { optionId: 'calabresa' },
        { optionId: 'marguerita' },
      ]),
    ).toBeNull();
  });

  it('mostra status por metade, bloqueia com uma só escolha e usa o maior preço', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onConfirm = vi.fn();

    try {
      await act(async () =>
        root.render(
          <ProductConfigurator
            product={{
              id: 'pizza-half',
              name: 'Pizza Meio a Meio',
              description: 'Escolha dois sabores.',
              image: '/pizza.webp',
              price: 39.9,
              pricingMode: 'HIGHEST_OPTION',
              portionConfiguration,
              optionGroups: [
                {
                  id: 'sabores',
                  name: 'Sabores',
                  required: true,
                  selectionType: 'MULTIPLE',
                  minSelections: 1,
                  maxSelections: 2,
                  options: [
                    {
                      id: 'calabresa',
                      referenceProductId: '10',
                      name: 'Calabresa',
                      image: '/calabresa.webp',
                      price: 39.9,
                      absolutePrice: 39.9,
                      pricingMode: 'ABSOLUTE',
                      active: true,
                    },
                    {
                      id: 'marguerita',
                      referenceProductId: '11',
                      name: 'Margherita',
                      image: '/marguerita.webp',
                      price: 42,
                      absolutePrice: 42,
                      pricingMode: 'ABSOLUTE',
                      active: true,
                    },
                  ],
                },
                {
                  id: 'extras',
                  name: 'Adicionais',
                  required: false,
                  selectionType: 'MULTIPLE',
                  minSelections: 0,
                  maxSelections: 3,
                  options: [
                    {
                      id: 'refrigerante',
                      name: 'Refrigerante 350ml',
                      image: '/refrigerante.webp',
                      price: 6,
                      pricingMode: 'ADDITIVE',
                      active: true,
                    },
                  ],
                },
              ],
            }}
            customerPageVariant
            enableProductQuantity
            embedded
            onClose={vi.fn()}
            onConfirm={onConfirm}
          />,
        ),
      );

      const dialog = container.querySelector('[data-testid="product-configurator"]') as HTMLElement;
      const submit = dialog.querySelector('button[type="submit"]') as HTMLButtonElement;

      expect(dialog.textContent).toContain('1ª Metade');
      expect(dialog.textContent).toContain('2ª Metade');
      expect(dialog.textContent).toContain('Adicionais');
      expect(dialog.textContent).toContain('Refrigerante 350ml');
      expect(dialog.textContent).toContain('Selecione as duas metades obrigatórias');
      const halfBuilder = dialog.querySelector('[aria-label="Escolha das duas metades"]');
      const extrasGroup = Array.from(dialog.querySelectorAll('.product-group')).find((group) =>
        group.textContent?.includes('Adicionais'),
      );
      if (!halfBuilder || !extrasGroup) {
        throw new Error('As metades devem aparecer antes do grupo de adicionais.');
      }
      expect(
        halfBuilder.compareDocumentPosition(extrasGroup) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(submit.disabled).toBe(true);

      const firstHalf = dialog.querySelector('input[name="half-0"][value="calabresa"]') as HTMLInputElement;
      await act(async () => firstHalf.click());

      expect(dialog.textContent).toContain('✓ Selecionado');
      expect(submit.disabled).toBe(true);

      const secondHalf = dialog.querySelector('input[name="half-1"][value="marguerita"]') as HTMLInputElement;
      await act(async () => secondHalf.click());

      expect(submit.disabled).toBe(false);
      expect(submit.textContent?.replace(/\s+/gu, ' ')).toContain('R$ 42,00');

      await act(async () => submit.click());

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          portions: [
            expect.objectContaining({ optionId: 'calabresa' }),
            expect.objectContaining({ optionId: 'marguerita' }),
          ],
        }),
        1,
      );
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
