import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QuantityStepper } from './QuantityStepper';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('QuantityStepper', () => {
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

  it('mantém o padrão único de menos, quantidade e mais com labels acessíveis', async () => {
    const onDecrease = vi.fn();
    const onIncrease = vi.fn();

    await act(async () => {
      root.render(
        <QuantityStepper
          value={2}
          ariaLabel="Quantidade do produto"
          decreaseLabel="Diminuir quantidade"
          increaseLabel="Aumentar quantidade"
          onDecrease={onDecrease}
          onIncrease={onIncrease}
        />,
      );
    });

    const stepper = container.querySelector('[data-quantity-stepper]');
    const buttons = Array.from(container.querySelectorAll('button'));
    expect(stepper?.getAttribute('aria-label')).toBe('Quantidade do produto');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe('—');
    expect(stepper?.querySelector('strong')?.textContent).toBe('2');
    expect(buttons[1].textContent).toBe('+');

    await act(async () => {
      buttons[0].click();
      buttons[1].click();
    });
    expect(onDecrease).toHaveBeenCalledOnce();
    expect(onIncrease).toHaveBeenCalledOnce();
  });

  it('respeita os limites desabilitando os lados independentemente', async () => {
    await act(async () => {
      root.render(
        <QuantityStepper
          value={1}
          decreaseLabel="Diminuir"
          increaseLabel="Aumentar"
          decreaseDisabled
          increaseDisabled
          onDecrease={vi.fn()}
          onIncrease={vi.fn()}
        />,
      );
    });

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);
  });
});
