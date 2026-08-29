import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminMockSettings } from '../data';
import { DeliverySettings } from './DeliverySettings';

describe('DeliverySettings', () => {
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

  it('renderiza os canais e a taxa fixa persistida como controles gerenciados', () => {
    act(() =>
      root.render(
        <DeliverySettings
          settings={{
            ...adminMockSettings,
            acceptsDelivery: true,
            acceptsPickup: false,
            minimumOrder: 25,
            deliveryFeeMode: 'FIXED',
            deliveryFee: 7.5,
            freeShippingMinimum: 80,
          }}
          update={() => undefined}
        />,
      ),
    );

    expect((container.querySelector('[aria-label="Delivery"]') as HTMLInputElement).checked).toBe(
      true,
    );
    expect(
      (container.querySelector('[aria-label="Retirada no balcão"]') as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (container.querySelector('[aria-label="Pedido mínimo (R$)"]') as HTMLInputElement).value,
    ).toBe('25');
    expect(
      (container.querySelector('[aria-label="Taxa padrão (R$)"]') as HTMLInputElement).value,
    ).toBe('7.5');
    expect(
      (container.querySelector('[aria-label="Frete grátis acima de (R$)"]') as HTMLInputElement)
        .value,
    ).toBe('80');
    expect(container.textContent).toContain('Taxa fixa');
    expect(container.textContent).toContain('Taxa por distância');
  });

  it('encaminha alterações dos canais ao estado da tela', () => {
    const update = vi.fn();
    act(() =>
      root.render(
        <DeliverySettings
          settings={{ ...adminMockSettings, acceptsDelivery: true }}
          update={update}
        />,
      ),
    );

    act(() => (container.querySelector('[aria-label="Delivery"]') as HTMLInputElement).click());

    expect(update).toHaveBeenCalledWith('acceptsDelivery', false);
  });

  it('permite selecionar taxa por distância', () => {
    const update = vi.fn();
    act(() =>
      root.render(
        <DeliverySettings
          settings={{ ...adminMockSettings, acceptsDelivery: true, deliveryFeeMode: 'FIXED' }}
          update={update}
        />,
      ),
    );

    const distanceButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Taxa por distância'),
    );

    expect(distanceButton).toBeTruthy();
    act(() => distanceButton?.click());

    expect(update).toHaveBeenCalledWith('deliveryFeeMode', 'DISTANCE');
  });

  it('renderiza e edita faixas por distância', () => {
    const update = vi.fn();
    act(() =>
      root.render(
        <DeliverySettings
          settings={{
            ...adminMockSettings,
            acceptsDelivery: true,
            deliveryFeeMode: 'DISTANCE',
            deliveryFeeRanges: [
              { id: 1, maxDistanceKm: 2, fee: 5, active: true },
              { id: 2, maxDistanceKm: 5, fee: 8, active: true },
            ],
          }}
          update={update}
        />,
      ),
    );

    expect(
      (container.querySelector('[aria-label="Distância máxima da faixa 1"]') as HTMLInputElement)
        .value,
    ).toBe('2');
    expect(
      (container.querySelector('[aria-label="Taxa da faixa 2"]') as HTMLInputElement).value,
    ).toBe('8');
    expect(container.textContent).toContain('Área máxima configurada: até 5 km.');

    act(() =>
      (container.querySelector('[aria-label="Taxa da faixa 1"]') as HTMLInputElement).dispatchEvent(
        new Event('change', { bubbles: true }),
      ),
    );
  });

  it('adiciona uma nova faixa por distância', () => {
    const update = vi.fn();
    act(() =>
      root.render(
        <DeliverySettings
          settings={{
            ...adminMockSettings,
            acceptsDelivery: true,
            deliveryFeeMode: 'DISTANCE',
            deliveryFeeRanges: [{ maxDistanceKm: 2, fee: 5, active: true }],
          }}
          update={update}
        />,
      ),
    );

    act(() =>
      (container.querySelector('[aria-label="Adicionar faixa de entrega"]') as HTMLButtonElement)
        .click(),
    );

    expect(update).toHaveBeenCalledWith('deliveryFeeRanges', [
      { maxDistanceKm: 2, fee: 5, active: true },
      { maxDistanceKm: 5, fee: 0, active: true },
    ]);
  });

  it('desabilita as regras de entrega enquanto o canal estiver desligado', () => {
    act(() =>
      root.render(
        <DeliverySettings
          settings={{
            ...adminMockSettings,
            acceptsDelivery: false,
            deliveryFeeMode: 'DISTANCE',
            deliveryFeeRanges: [{ maxDistanceKm: 2, fee: 5, active: true }],
          }}
          update={() => undefined}
        />,
      ),
    );

    const numericInputs = Array.from(
      container.querySelectorAll('input[type="number"]'),
    ) as HTMLInputElement[];

    expect(numericInputs.length).toBeGreaterThan(0);
    expect(numericInputs.every((input) => input.disabled)).toBe(true);
    expect(container.textContent).toContain(
      'Ative o canal Delivery para configurar as regras de entrega.',
    );
  });
});
