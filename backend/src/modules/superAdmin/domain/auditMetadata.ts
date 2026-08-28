import type { Prisma } from '@prisma/client';

const REDACTED = '[REDACTED]';
const sensitiveKey =
  /password|senha|secret|token|authorization|cookie|hash|credential|api[_-]?key|private[_-]?key|access[_-]?key|pixQrCode|paymentLink|documentFile/iu;

function redactValue(value: unknown, seen: WeakSet<object>): Prisma.InputJsonValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map((item) => redactValue(item, seen));
  if (typeof value !== 'object') return String(value);
  if (seen.has(value as object)) return '[CIRCULAR]';

  seen.add(value as object);
  const result: Record<string, Prisma.InputJsonValue> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = sensitiveKey.test(key) ? REDACTED : redactValue(item, seen);
  }
  seen.delete(value as object);
  return result;
}

export function buildAuditMetadata(input: {
  reason?: string | null;
  before?: unknown;
  after?: unknown;
}): Prisma.InputJsonObject {
  return {
    reason: input.reason?.trim() || null,
    before: redactValue(input.before ?? null, new WeakSet()),
    after: redactValue(input.after ?? null, new WeakSet()),
  };
}
