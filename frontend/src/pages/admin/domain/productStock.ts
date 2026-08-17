export function isUnlimitedStock(stock: number | null | undefined) {
  return stock === null || stock === undefined;
}

export function isProductActiveFromStock(stock: number | null | undefined) {
  return isUnlimitedStock(stock) || stock > 0;
}

export function normalizeProductStock(value: string, unlimited: boolean) {
  if (unlimited) return null;
  const stock = Number(value);
  if (value === '' || !Number.isInteger(stock) || stock < 0) {
    throw new Error('Informe uma quantidade válida para o estoque.');
  }
  return stock;
}
