import { describe, expect, it } from 'vitest';

import { getCardPaymentErrorTitle, selectMercadoPagoPaymentMethod } from '../domain/cardPayment';

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


describe('getCardPaymentErrorTitle', () => {
  it('usa título específico para erro no débito', () => {
    expect(getCardPaymentErrorTitle('debit')).toBe(
      'Não foi possível usar este cartão no débito',
    );
  });

  it('mantém título neutro e claro para erro no crédito', () => {
    expect(getCardPaymentErrorTitle('credit')).toBe(
      'Não foi possível usar este cartão',
    );
  });
});
