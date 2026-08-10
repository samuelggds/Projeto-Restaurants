export function isProductUnavailable(product: Record<string, unknown>): boolean {
  if (product.active === false) return true;
  const stock = product.stock;
  if (stock === null || stock === undefined || stock === "") return false;
  const value = typeof stock === "string" ? Number(stock.replace(",", ".")) : Number(stock);
  return Number.isFinite(value) && value <= 0;
}

export function toPositiveInteger(value: unknown): number | null {
  const number = Number(value || 0);
  return Number.isInteger(number) && number > 0 ? number : null;
}
