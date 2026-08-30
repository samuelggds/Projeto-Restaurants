import { describe, expect, it } from 'vitest';
import {
  getPaymentMethodErrorMessage,
  selectSavedPaymentMethod,
  type CustomerPaymentMethod,
} from './customerPaymentMethodService';

const cards: CustomerPaymentMethod[] = [
  { publicId: 'first', provider: 'PAGBANK', brand: 'visa', last4: '1111', expMonth: 1, expYear: 2030, isDefault: false },
  { publicId: 'default', provider: 'PAGBANK', brand: 'mastercard', last4: '2222', expMonth: 2, expYear: 2031, isDefault: true },
];

describe('selectSavedPaymentMethod', () => {
  it('uses the card explicitly selected by the customer', () => expect(selectSavedPaymentMethod(cards, 'first')?.publicId).toBe('first'));
  it('falls back to the default card', () => expect(selectSavedPaymentMethod(cards, 'missing')?.publicId).toBe('default'));
  it('returns null when no card is available', () => expect(selectSavedPaymentMethod([], null)).toBeNull());
});

describe('getPaymentMethodErrorMessage', () => {
  it('prioritizes the useful message returned by the backend', () => {
    expect(getPaymentMethodErrorMessage({ response: { data: { error: 'Confira os dados do cartão.' } } }, 'Falha')).toBe('Confira os dados do cartão.');
  });

  it('does not expose the generic Axios status message to the customer', () => {
    expect(getPaymentMethodErrorMessage(new Error('Request failed with status code 400'), 'Pagamento indisponível.')).toBe('Pagamento indisponível.');
  });

  it('hides internal provider configuration details from the customer', () => {
    expect(
      getPaymentMethodErrorMessage(
        { response: { data: { error: 'O Mercado Pago ainda não foi configurado para este restaurante.' } } },
        'Cadastro de cartões indisponível no momento.',
      ),
    ).toBe('Cadastro de cartões indisponível no momento.');
  });
});
