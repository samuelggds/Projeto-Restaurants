import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import customerPaymentMethodService from '../../../Services/customerPaymentMethodService';
import { PaymentOptions } from './PaymentOptions';

vi.mock('../../../Services/customerPaymentMethodService', () => ({
  default: {
    list: vi.fn(),
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('PaymentOptions interaction', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.resetAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('não troca Pix por cartão automaticamente ao encontrar cartão salvo', async () => {
    vi.mocked(customerPaymentMethodService.list).mockResolvedValue([
      {
        publicId: 'card-public-1',
        provider: 'MERCADO_PAGO',
        providerCardId: 'provider-card-1',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2030,
        holderName: 'Cliente Teste',
        isDefault: true,
      },
    ] as Awaited<ReturnType<typeof customerPaymentMethodService.list>>);
    const onChange = vi.fn();

    await act(async () => {
      root.render(
        <PaymentOptions
          paymentMethod="pix"
          allowPayOnDelivery
          allowPix
          allowCard
          loggedIn
          restaurantId={1}
          figmaCheckout
          onChange={onChange}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(customerPaymentMethodService.list).toHaveBeenCalledWith(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('mantém Pix escolhido pelo visitante sem redirecionar silenciosamente para cartão', async () => {
    const onChange = vi.fn();

    await act(async () => {
      root.render(
        <PaymentOptions
          paymentMethod="pix"
          allowPayOnDelivery
          allowPix
          allowCard
          loggedIn={false}
          restaurantId={1}
          figmaCheckout
          onChange={onChange}
        />,
      );
      await Promise.resolve();
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});
