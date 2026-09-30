import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
}));

vi.mock('../../../Services/publicCardPaymentService', () => ({
  default: {
    getConfig: mocks.getConfig,
  },
}));

import { OnlineCardPaymentForm } from './OnlineCardPaymentForm';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('OnlineCardPaymentForm visualTestMode', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza dados fictícios sem consultar configuração ou gateway', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onPreparerChange = vi.fn();

    await act(async () => {
      root.render(
        <OnlineCardPaymentForm
          restaurantId={999999}
          payerEmail="teste.visual@example.invalid"
          paymentType="credit"
          onPreparerChange={onPreparerChange}
          visualTestMode
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.getConfig).not.toHaveBeenCalled();
    expect(
      container.querySelector<HTMLInputElement>('[aria-label="Número do cartão fictício"]')?.value,
    ).toBe('0000 0000 0000 0000');
    expect(
      container.querySelector<HTMLInputElement>('[aria-label="Validade fictícia"]')?.value,
    ).toBe('12/30');
    expect(
      container.querySelector<HTMLInputElement>('[aria-label="CVV fictício"]')?.value,
    ).toBe('123');
    expect(onPreparerChange).toHaveBeenCalledWith(null);

    act(() => root.unmount());
    container.remove();
  });
});
