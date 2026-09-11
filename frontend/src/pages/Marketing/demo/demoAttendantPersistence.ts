import type { Raw, SupportThread } from '../../attendant/operation-center/types';

const record = (value: unknown): value is Raw =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));
const pair = (value: unknown): value is [number, Raw] =>
  Array.isArray(value) &&
  value.length === 2 &&
  Number.isSafeInteger(value[0]) &&
  value[0] > 0 &&
  record(value[1]);

export function sanitizeDemoAttendant(value: unknown) {
  if (!record(value)) return undefined;
  const details: [number, Raw][] = Array.isArray(value.details) ? value.details.filter(pair) : [];
  const threads: [number, SupportThread][] = [];
  for (const entry of Array.isArray(value.threads) ? value.threads : []) {
    if (!pair(entry)) continue;
    const [id, thread] = entry;
    if (
      thread.orderId !== id ||
      typeof thread.customerName !== 'string' ||
      typeof thread.orderStatus !== 'string' ||
      typeof thread.isResolved !== 'boolean' ||
      !Array.isArray(thread.messages)
    )
      continue;
    const messages = thread.messages.filter(
      (message) =>
        record(message) &&
        typeof message.message === 'string' &&
        ['senderType', 'senderName', 'sentAt'].every(
          (key) => message[key] === undefined || typeof message[key] === 'string',
        ),
    );
    threads.push([id, { ...thread, messages } as SupportThread]);
  }
  return { details, threads };
}
