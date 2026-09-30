export type CardPaymentType = 'credit' | 'debit';

export function selectMercadoPagoPaymentMethod(
  results: Array<{ id?: string; payment_type_id?: string }> | undefined,
  paymentType: CardPaymentType,
) {
  const expectedType = paymentType === 'debit' ? 'debit_card' : 'credit_card';
  const method = (results || []).find(
    (candidate) =>
      String(candidate.payment_type_id || '').trim().toLowerCase() === expectedType,
  );
  return String(method?.id || '').trim();
}

export function getCardPaymentErrorTitle(paymentType: CardPaymentType) {
  return paymentType === 'debit'
    ? 'Não foi possível usar este cartão no débito'
    : 'Não foi possível usar este cartão';
}
