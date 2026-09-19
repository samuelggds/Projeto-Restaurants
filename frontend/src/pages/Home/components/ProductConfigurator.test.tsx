import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ProductConfigurator } from './ProductConfigurator';
import { productConfigurationTotal, type ProductOptionGroup } from '../domain/productCustomization';

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
