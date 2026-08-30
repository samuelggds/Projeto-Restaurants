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
