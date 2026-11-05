/** Compare the signed NFC draft with the order payload by values, not JSON
 * object-key order. PostgreSQL jsonb may reorder keys on persistence.
 *
 * This remains strict: every approved item must have exactly the original
 * product and quantity, in the same array position. No extra fields accepted.
 */
export function sameNfcConfirmedItems(
  draft: unknown,
  actual: ReadonlyArray<{ productId: number; quantity: number }>,
): boolean {
  if (!Array.isArray(draft) || draft.length !== actual.length) return false;
  return draft.every((value: unknown, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const row = value as Record<string, unknown>;
    const keys = Object.keys(row);
    if (keys.length !== 2 || !keys.includes('productId') || !keys.includes('quantity')) return false;
    const candidate = actual[index];
    return candidate !== undefined
      && Number.isSafeInteger(row.productId) && Number(row.productId) > 0
      && Number.isSafeInteger(row.quantity) && Number(row.quantity) > 0
      && row.productId === candidate.productId
      && row.quantity === candidate.quantity;
  });
}
