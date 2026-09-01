export function moneyToCents(value: unknown, field = 'valor'): bigint {
  const normalized = String(value ?? '')
    .trim()
    .replace(',', '.');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) throw new Error(`${field} deve ser um valor monetário válido e não negativo.`);
  return BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0'));
}

export function centsToMoney(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  return `${negative ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}

export function centsToNumber(cents: bigint): number {
  return Number(cents) / 100;
}
