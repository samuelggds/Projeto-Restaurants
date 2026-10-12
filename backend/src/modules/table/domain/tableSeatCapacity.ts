export const MIN_TABLE_SEATS = 1;
export const MAX_TABLE_SEATS = 50;

export function parseTableSeatCapacity(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new Error('Informe a quantidade de lugares da mesa.');
  }
  const text = String(value);
  if (!/^[0-9]+$/u.test(text) || !text.trim()) {
    throw new Error('Informe um número inteiro de lugares entre 1 e 50.');
  }
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < MIN_TABLE_SEATS || count > MAX_TABLE_SEATS) {
    throw new Error('Informe um número inteiro de lugares entre 1 e 50.');
  }
  return count;
}
