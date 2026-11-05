import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../Services/api';
import { NfcPaymentPanel } from './NfcPaymentPanel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('NFC payment first CPF verification', () => {
  let element: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
    root = createRoot(element);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    act(() => root.unmount());
    element.remove();
  });
  it('starts ready, validates full CPF via authenticated backend, then shows the comanda', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        card: { status: 'ACTIVE', displayCode: 'NFC-TEST' },
        comanda: { id: '00000000-0000-4000-8000-000000000001',
          status: 'OPEN', totalCents: 2500, paidCents: 0, outstandingCents: 2500 },
        pixEnabled: false, pointEnabled: false, reason: 'Pagamento pendente.',
      },
    });
    act(() => root.render(<NfcPaymentPanel token="valid-nfc-token" displayCode="NFC-TEST" onReleased={() => {}} />));
    const field = element.querySelector<HTMLInputElement>('input[type="password"]')!;
    const submit = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submit.disabled).toBe(true);
    expect(submit.textContent).toContain('Verificar CPF e acessar pagamentos');
    expect(element.textContent).not.toContain('Validando titular...');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(field, '52998224725');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(submit.disabled).toBe(false);
    await act(async () => {
      element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(post).toHaveBeenCalledWith('/nfc-registration/cards/payment-context',
      { token: 'valid-nfc-token', cpf: '52998224725' }, { skipBaseUrlFallback: true });
    expect(element.textContent).toContain('Saldo a pagar');
  });
});
