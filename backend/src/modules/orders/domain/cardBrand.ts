const aliases: Record<string, string> = {
  visa: 'visa',
  master: 'mastercard',
  mastercard: 'mastercard',
  mc: 'mastercard',
  elo: 'elo',
  amex: 'amex',
  americanexpress: 'amex',
  hipercard: 'hipercard',
  diners: 'diners',
  dinersclub: 'diners',
  discover: 'discover',
  jcb: 'jcb',
  cartao: 'card',
  card: 'card',
};

export function normalizeStoredCardBrand(value: unknown) {
  const normalized = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return aliases[normalized] || 'card';
}

const mercadoPagoAliases: Record<string, string> = {
  visa: 'visa',
  master: 'master',
  mastercard: 'master',
  mc: 'master',
  elo: 'elo',
  amex: 'amex',
  americanexpress: 'amex',
  hipercard: 'hipercard',
  diners: 'diners',
  dinersclub: 'diners',
  discover: 'discover',
  jcb: 'jcb',
};

export function normalizeMercadoPagoPaymentMethodId(value: unknown) {
  const normalized = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normalized || normalized === 'card' || normalized === 'cartao') return '';
  return mercadoPagoAliases[normalized] || normalized;
}
