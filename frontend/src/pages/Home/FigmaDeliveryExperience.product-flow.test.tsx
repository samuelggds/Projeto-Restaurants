import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FigmaDeliveryExperience } from './FigmaDeliveryExperience';
import { homeMockData } from './data';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('FigmaDeliveryExperience product flow', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('scrollTo', vi.fn());
  });

  it('abre detalhes para produto COMPLETE e adiciona somente após confirmação', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onAddProduct = vi.fn();

    await act(async () => {
      root.render(
        <FigmaDeliveryExperience
          data={{
            ...homeMockData,
            isOpen: true,
            deliveryTime: '25-35',
            brand: { ...homeMockData.brand, name: 'Restaurante Demo' },
            categories: [{ id: 'lanches', name: 'Lanches', image: '' }],
            products: [
              {
                id: 'ready-1',
                categoryId: 'lanches',
                name: 'Refrigerante',
                description: 'Produto pronto',
                image: '',
                price: 6,
                originalPrice: 6,
                rating: 0,
                available: true,
                kind: 'STANDARD',
                saleMode: 'COMPLETE',
                configurationVersion: 2,
              },
            ],
          }}
          onAddProduct={onAddProduct}
        />,
      );
    });

    const add = container.querySelector(
      'button[aria-label="Adicionar Refrigerante"]',
    ) as HTMLButtonElement;
    expect(add).toBeTruthy();

    await act(async () => add.click());

    const detail = document.querySelector('[data-ready-product-detail]') as HTMLElement;
    expect(detail).toBeTruthy();
    expect(detail.textContent).toContain('Refrigerante');
    expect(detail.textContent).toContain('25-35 min');
    expect(onAddProduct).not.toHaveBeenCalled();
    expect(document.querySelector('[aria-label="Montar Refrigerante"]')).toBeNull();

    const observation = detail.querySelector('textarea') as HTMLTextAreaElement;
    await act(async () => {
      observation.value = 'Bem gelado';
      observation.dispatchEvent(new Event('input', { bubbles: true }));
      (
        detail.querySelector('button[data-cart-fly-source="dialog"]') as HTMLButtonElement
      ).click();
    });

    expect(onAddProduct).toHaveBeenCalledWith(
      'ready-1',
      {
        selectedOptions: [],
        selectedOptionIds: [],
        observation: 'Bem gelado',
        configurationVersion: 2,
      },
      1,
    );

    act(() => root.unmount());
    container.remove();
  });

  it('abre configurador para produto BUILDABLE e só adiciona após confirmar', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onAddProduct = vi.fn();

    await act(async () => {
      root.render(
        <FigmaDeliveryExperience
          data={{
            ...homeMockData,
            isOpen: true,
            brand: { ...homeMockData.brand, name: 'Restaurante Demo' },
            categories: [{ id: 'lanches', name: 'Lanches', image: '' }],
            products: [
              {
                id: 'custom-1',
                categoryId: 'lanches',
                name: 'Smash Bacon',
                description: 'Personalizável',
                image: '',
                price: 28.9,
                originalPrice: 28.9,
                rating: 0,
                available: true,
                kind: 'STANDARD',
                saleMode: 'BUILDABLE',
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
                    ],
                  },
                ],
              },
            ],
          }}
          onAddProduct={onAddProduct}
        />,
      );
    });

    const add = container.querySelector(
      'button[aria-label="Adicionar Smash Bacon"]',
    ) as HTMLButtonElement;

    await act(async () => add.click());

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'auto',
    });

    await vi.waitFor(() => {
      expect(container.querySelector('[aria-label="Montar Smash Bacon"]')).toBeTruthy();
    });

    const dialog = container.querySelector(
      '[aria-label="Montar Smash Bacon"]',
    ) as HTMLElement;

    expect(onAddProduct).not.toHaveBeenCalled();

    await act(async () => {
      (dialog.querySelector('input[value="ao-ponto"]') as HTMLInputElement).click();
      (dialog.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    });

    expect(onAddProduct).toHaveBeenCalledWith(
      'custom-1',
      expect.objectContaining({ selectedOptionIds: ['ao-ponto'] }),
      1,
    );

    act(() => root.unmount());
    container.remove();
  });
});
