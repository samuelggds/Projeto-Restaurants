/**
 * Search is executed only by the authenticated backend. NFC customer names and
 * telephone numbers remain encrypted at rest; never index or send plaintext PII.
 */
export function normalizeLinkedNfcSearch(value: string) {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
}

export function linkedNfcCustomerMatches(
  query: string,
  name: string,
  phone: string,
  cpfFingerprintMatches: boolean,
) {
  const normalized = normalizeLinkedNfcSearch(query);
  if (!normalized) return true;
  if (cpfFingerprintMatches) return true;
  if (normalizeLinkedNfcSearch(name).includes(normalized)) return true;
  const digits = query.replace(/\D/g, '');
  return digits.length >= 4 && phone.replace(/\D/g, '').includes(digits);
}

export function linkedNfcPaymentState(
  comanda: { status: 'OPEN' | 'UNPAID' | 'PAID'; totalCents: number; paidCents: number } | null,
): 'NO_VISIT' | 'WAITING_ORDER' | 'IN_SERVICE' | 'PENDING' | 'PAID' {
  if (!comanda) return 'NO_VISIT';
  if (comanda.status === 'PAID' && comanda.totalCents === comanda.paidCents) return 'PAID';
  if (comanda.status === 'UNPAID') return 'PENDING';
  if (comanda.status === 'OPEN' && comanda.totalCents === 0) return 'WAITING_ORDER';
  return 'IN_SERVICE';
}
