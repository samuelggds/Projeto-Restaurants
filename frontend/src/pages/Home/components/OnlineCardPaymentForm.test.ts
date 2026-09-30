import { describe, expect, it } from 'vitest';

import { selectMercadoPagoPaymentMethod } from './OnlineCardPaymentForm';

describe('selectMercadoPagoPaymentMethod', () => {
  const methods = [
    { id: 'visa-credit', payment_type_id: 'credit_card' },
    { id: 'visa-debit', payment_type_id: 'debit_card' },
  ];

  it('seleciona somente a opção de crédito quando o checkout pediu crédito', () => {
    expect(selectMercadoPagoPaymentMethod(methods, 'credit')).toBe('visa-credit');
  });

  it('seleciona somente a opção de débito quando o checkout pediu débito', () => {
    expect(selectMercadoPagoPaymentMethod(methods, 'debit')).toBe('visa-debit');
  });

  it('não faz fallback silencioso de débito para crédito', () => {
    expect(
      selectMercadoPagoPaymentMethod(
        [{ id: 'visa-credit', payment_type_id: 'credit_card' }],
        'debit',
      ),
    ).toBe('');
  });
});
