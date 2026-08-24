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

  it('renderiza os canais e valores persistidos como controles gerenciados', () => {
    act(() =>
      root.render(
        <DeliverySettings
          settings={{
            ...adminMockSettings,
            acceptsDelivery: true,
            acceptsPickup: false,
            minimumOrder: 25,
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
    expect(container.textContent).not.toContain('Raio máximo');
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

  it('desabilita regras de entrega enquanto o canal estiver desligado', () => {
    act(() =>
      root.render(
        <DeliverySettings
          settings={{ ...adminMockSettings, acceptsDelivery: false }}
          update={() => undefined}
        />,
      ),
    );

    const numericInputs = Array.from(
      container.querySelectorAll('input[type="number"]'),
    ) as HTMLInputElement[];
    expect(numericInputs).toHaveLength(3);
    expect(numericInputs.every((input) => input.disabled)).toBe(true);
    expect(container.textContent).toContain(
      'Ative o canal Delivery para configurar as regras de entrega.',
    );
  });
});
