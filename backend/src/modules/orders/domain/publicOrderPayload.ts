/** Internal persistence/verification material must never cross an API boundary.
 * Keep Date/Decimal/binary instances intact so existing serializers retain their format.
 * This is defense in depth for legacy controllers, alongside explicit query projections.
 */
const privateOrderFields = new Set([
  'creationActor', 'creationRequestKey', 'creationFingerprint',
  'refundIdempotencyKey', 'paymentConfirmationPin', 'paymentConfirmationPinExpiresAt',
]);

export function publicOrderPayload<T>(payload: T): T {
  const visited = new WeakMap<object, unknown>();
  const clean = (value: unknown): unknown => {
    if (!value || typeof value !== 'object') return value;
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return value;
    if (visited.has(value)) return visited.get(value);
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      visited.set(value, result);
      for (const item of value) result.push(clean(item));
      return result;
    }
    const result: Record<string, unknown> = {};
    visited.set(value, result);
    for (const [key, item] of Object.entries(value)) {
      if (!privateOrderFields.has(key)) {
        Object.defineProperty(result, key, { value: clean(item), enumerable: true, writable: true, configurable: true });
      }
    }
    return result;
  };
  return clean(payload) as T;
}
