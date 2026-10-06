import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import publicCardPaymentService from '../../../Services/publicCardPaymentService';
import {
  collectMercadoPagoDeviceSession,
  requireMercadoPagoDeviceSession,
} from '../../../shared/payments/mercadoPagoDeviceSession';
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
  requireMercadoPagoDeviceSession: vi.fn(),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('OnlineCardPaymentForm manual card flow', () => {
  let container: HTMLDivElement;
  let root: Root;
  const preparer: { current: CardPaymentPreparer | null } = { current: null };
  const createCardToken = vi.fn<(input: Record<string, string>) => Promise<MercadoPagoCardToken>>();
  const createField = vi.fn(() => ({ mount: vi.fn(), unmount: vi.fn(), on: vi.fn() }));
  const originalMercadoPago = window.MercadoPago;
  const originalDeviceSessionId = window.MP_DEVICE_SESSION_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    preparer.current = null;
    delete window.MP_DEVICE_SESSION_ID;
    vi.mocked(collectMercadoPagoDeviceSession).mockResolvedValue('test-device-session');
    vi.mocked(requireMercadoPagoDeviceSession).mockResolvedValue('test-device-session');
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

  async function renderForm(paymentType: 'credit' | 'debit' = 'credit') {
    await act(async () => {
      root.render(
        <OnlineCardPaymentForm
          restaurantId={7}
          payerEmail="cliente@example.com"
          paymentType={paymentType}
          onPreparerChange={(next) => {
            preparer.current = next;
          }}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
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

  it('sempre monta os três campos seguros do cartão Mercado Pago', async () => {
    await renderForm();

    expect(createField).toHaveBeenCalledWith('cardNumber', { placeholder: 'Número do cartão' });
    expect(createField).toHaveBeenCalledWith('expirationDate', { placeholder: 'MM/AA' });
    expect(createField).toHaveBeenCalledWith('securityCode', { placeholder: 'CVV' });
    expect(createField).toHaveBeenCalledTimes(3);
    expect(container.textContent).toContain('Nome impresso no cartão');
    expect(container.textContent).toContain('CPF/CNPJ do titular');
    expect(container.textContent).not.toContain('cartão salvo');
  });

  it('gera token como cartão novo e nunca envia paymentMethodId salvo', async () => {
    await renderForm();
    await fillInput('input[autocomplete="cc-name"]', 'Cliente Teste');
    await fillInput('input[placeholder="Somente números"]', '12345678909');

    const payload = await prepare();

    expect(createCardToken).toHaveBeenCalledWith({
      cardholderName: 'Cliente Teste',
      identificationType: 'CPF',
      identificationNumber: '12345678909',
    });
    expect(payload).toMatchObject({
      cardToken: 'fresh-card-token',
      cardPaymentMethodId: 'master',
      cardPaymentType: 'credit',
      payerEmail: 'cliente@example.com',
      mercadoPagoDeviceId: 'test-device-session',
    });
    expect(payload).not.toHaveProperty('paymentMethodId');
    expect(payload).not.toHaveProperty('cardData');
  });
  it('usa a bandeira do token no débito quando a consulta por BIN não retorna debit_card', async () => {
    window.MercadoPago = class {
      fields = { create: createField, createCardToken };
      getPaymentMethods = vi.fn().mockResolvedValue({
        results: [{ id: 'visa', payment_type_id: 'credit_card' }],
      });
    };

    createCardToken.mockResolvedValue({
      id: 'fresh-debit-token',
      payment_method_id: 'visa',
      last_four_digits: '1982',
    });

    await renderForm('debit');
    await fillInput('input[autocomplete="cc-name"]', 'Cliente Teste');
    await fillInput('input[placeholder="Somente números"]', '12345678909');

    const payload = await prepare();

    expect(payload).toMatchObject({
      cardToken: 'fresh-debit-token',
      cardPaymentMethodId: 'visa',
      cardPaymentType: 'debit',
      payerEmail: 'cliente@example.com',
      mercadoPagoDeviceId: 'test-device-session',
    });
    expect(payload).not.toHaveProperty('paymentMethodId');
    expect(payload).not.toHaveProperty('cardData');
  });

});
