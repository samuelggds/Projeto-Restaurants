/**
 * Summarizes operation counts over an observed elapsed interval.
 * "Sent requests" and "successful responses" are intentionally
 * calculated separately by the load-test caller.
 */
export function calculateLoadRps(count: number, durationMs: number): number {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('count must be a non-negative safe integer');
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new RangeError('durationMs must be positive and finite');
  }

  return Number(((count * 1000) / durationMs).toFixed(3));
}
