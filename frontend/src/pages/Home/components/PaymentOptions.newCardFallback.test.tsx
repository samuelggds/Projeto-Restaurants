import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import customerPaymentMethodService from '../../../Services/customerPaymentMethodService';
import { PaymentOptions } from './PaymentOptions';

vi.mock('../../../Services/customerPaymentMethodService', () => ({
  default: { list: vi.fn() },
}));

vi.mock('./OnlineCardPaymentForm', () => ({
  OnlineCardPaymentForm: ({
    savedCard,
    onPreparerChange,
  }: {
    savedCard?: { publicId?: string } | null;
    onPreparerChange: (preparer: (() => Promise<Record<string, unknown>>) | null) => void;
  }) => {
    useEffect(() => {
      onPreparerChange(async () =>
        savedCard
          ? { paymentMethodId: savedCard.publicId, cardToken: 'saved-token' }
          : { cardToken: 'new-token' },
      );
      return () => onPreparerChange(null);
    }, [onPreparerChange, savedCard]);
    return <div data-testid="card-mode">{savedCard ? 'saved-card' : 'new-card'}</div>;
  },
}));

describe('PaymentOptions logged-in new-card fallback', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    vi.mocked(customerPaymentMethodService.list).mockResolvedValue([
      {
        publicId: 'saved-card-1',
        restaurantId: 7,
        provider: 'MERCADO_PAGO',
        providerCardId: 'mp-card-1',
        brand: 'master',
        last4: '0829',
        expMonth: 12,
        expYear: 2030,
        holderName: 'Cliente Teste',
        isDefault: true,
      } as never,
    ]);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('switches from a saved card to the full new-card form without leaving checkout', async () => {
    await act(async () => {
      root.render(
        <PaymentOptions
          paymentMethod="card"
          allowPayOnDelivery
          allowCard
          restaurantId={7}
          loggedIn
          userEmail="cliente@example.test"
          onChange={() => undefined}
          figmaCheckout
        />,
      );
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="card-mode"]')?.textContent).toBe('saved-card');
    const useOtherCard = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.includes('Usar outro cartão'),
    );
    expect(useOtherCard).toBeTruthy();

    await act(async () => useOtherCard?.click());

    expect(container.querySelector('[data-testid="card-mode"]')?.textContent).toBe('new-card');
    expect(container.textContent).toContain('Usar outro cartão');
  });
});
