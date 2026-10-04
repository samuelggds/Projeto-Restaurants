import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CustomerPaymentMethod } from '../../../Services/customerPaymentMethodService';
import publicCardPaymentService from '../../../Services/publicCardPaymentService';
import { collectMercadoPagoDeviceSession } from '../../../shared/payments/mercadoPagoDeviceSession';
import type { MercadoPagoCardToken } from '../../../shared/payments/mercadoPagoSdk';
import {
  OnlineCardPaymentForm,
  type CardPaymentPreparer,
  type PreparedCardPayment,
} from './OnlineCardPaymentForm';

vi.mock('../../../Services/publicCardPaymentService', () => ({
  default: { getConfig: vi.fn() },
}));
vi.mock('../../../shared/payments/mercadoPagoDeviceSession', () => ({
  collectMercadoPagoDeviceSession: vi.fn(),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const savedCard: CustomerPaymentMethod = {
  publicId: 'saved-card-public-id',
  provider: 'MERCADO_PAGO',
  providerCardId: 'provider-card-id',
  brand: 'master',
  last4: '0829',
  expMonth: 12,
  expYear: 2030,
  holderName: 'Cliente Teste',
  isDefault: true,
};

describe('OnlineCardPaymentForm preparação segura do Mercado Pago', () => {
  let container: HTMLDivElement;
  let root: Root;
  const preparer: { current: CardPaymentPreparer | null } = { current: null };
  const registerPreparer = (next: CardPaymentPreparer | null) => {
    preparer.current = next;
  };
  const createCardToken = vi.fn<(input: Record<string, string>) => Promise<MercadoPagoCardToken>>();
  const createField = vi.fn(() => ({ mount: vi.fn(), unmount: vi.fn() }));
  const originalMercadoPago = window.MercadoPago;
  const originalDeviceSessionId = window.MP_DEVICE_SESSION_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    preparer.current = null;
    delete window.MP_DEVICE_SESSION_ID;
    vi.mocked(collectMercadoPagoDeviceSession).mockImplementation(
      async () => String(window.MP_DEVICE_SESSION_ID || '').trim() || undefined,
    );
    vi.mocked(publicCardPaymentService.getConfig).mockResolvedValue({
      provider: 'MERCADO_PAGO',
      publicKey: 'restaurant-public-key',
    });
    createCardToken.mockResolvedValue({
      id: 'fresh-card-token',
      payment_method_id: 'master',
      last_four_digits: '0829',
    });
    window.MercadoPago = class {
      fields = { create: createField, createCardToken };
      getPaymentMethods = vi.fn().mockResolvedValue({ results: [] });
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    window.MercadoPago = originalMercadoPago;
    window.MP_DEVICE_SESSION_ID = originalDeviceSessionId;
  });

  async function renderForm(card?: CustomerPaymentMethod) {
    await act(async () => {
      root.render(
        <OnlineCardPaymentForm
          restaurantId={7}
          savedCard={card}
          payerEmail="cliente@example.com"
          onPreparerChange={registerPreparer}
        />,
      );
    });
  }

  async function fillInput(selector: string, value: string) {
    const input = container.querySelector<HTMLInputElement>(selector);
    expect(input).not.toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
      input!.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  async function prepare() {
    expect(preparer.current).not.toBeNull();
    let payload: PreparedCardPayment = {};
    await act(async () => {
      payload = await preparer.current!();
    });
    return payload;
  }

  it.each(['salvo', 'novo'] as const)(
    'encaminha a sessão antifraude atual junto ao token do cartão %s',
    async (cardType) => {
      await renderForm(cardType === 'salvo' ? savedCard : undefined);
      if (cardType === 'novo') {
        await fillInput('input[autocomplete="cc-name"]', 'Cliente Teste');
        await fillInput('input[placeholder="Somente números"]', '12345678909');
      }

      // The provider can publish the session after the form has mounted.
      window.MP_DEVICE_SESSION_ID = ' device-session-at-payment ';
      const payload = await prepare();

      expect(payload).toMatchObject({
        cardToken: 'fresh-card-token',
        cardPaymentMethodId: 'master',
        cardPaymentType: 'credit',
        mercadoPagoDeviceId: 'device-session-at-payment',
      });
      if (cardType === 'salvo') {
        expect(createCardToken).toHaveBeenCalledWith({ cardId: 'provider-card-id' });
        expect(payload.paymentMethodId).toBe('saved-card-public-id');
        expect(createField).toHaveBeenCalledTimes(1);
        expect(createField).toHaveBeenCalledWith('securityCode', { placeholder: 'CVV' });
      } else {
        expect(createCardToken).toHaveBeenCalledWith({
          cardholderName: 'Cliente Teste',
          identificationType: 'CPF',
          identificationNumber: '12345678909',
        });
        expect(payload.payerEmail).toBe('cliente@example.com');
        expect(payload).not.toHaveProperty('paymentMethodId');
      }
      expect(payload).not.toHaveProperty('cardData');
      expect(payload).not.toHaveProperty('securityCode');
    },
  );

  it('gera outro token CVV para cada tentativa e usa o cartão salvo selecionado', async () => {
    await renderForm(savedCard);
    createCardToken.mockResolvedValueOnce({ id: 'first-cvv-token' });
    expect((await prepare()).cardToken).toBe('first-cvv-token');

    await renderForm({
      ...savedCard,
      publicId: 'second-saved-card',
      providerCardId: 'second-provider-card',
    });
    createCardToken.mockResolvedValueOnce({ id: 'second-cvv-token' });
    const payload = await prepare();

    expect(createCardToken).toHaveBeenNthCalledWith(2, { cardId: 'second-provider-card' });
    expect(payload).toMatchObject({
      paymentMethodId: 'second-saved-card',
      cardToken: 'second-cvv-token',
      cardPaymentMethodId: 'master',
    });
  });
});
