import { createHash, randomUUID } from 'node:crypto';
import prisma from '../config/prisma.js';
import {
  encryptCredential,
  decryptCredential,
} from '../modules/restaurantSettings/security/credentialEncryption.js';

type Message = {
  channel: 'whatsapp';
  from: string;
  to: string;
  message: string;
  metadata: Record<string, unknown>;
};
type Row = { id: string; restaurantId: number; payload: string; attempts: number; createdAt: Date };
type Database = Pick<typeof prisma, '$queryRaw' | '$executeRaw' | 'order' | 'restaurantSettings'>;
const context = (id: string) => `notification-outbox:${id}`;

export function notificationKey(
  restaurantId: number,
  metadata: Record<string, unknown>,
  occurrence = randomUUID(),
) {
  const stable = ['PAYMENT_CONFIRMED', 'ORDER_STATUS_CHANGED'].includes(String(metadata.event));
  return createHash('sha256')
    .update(
      JSON.stringify([
        restaurantId,
        metadata.orderId,
        metadata.event,
        metadata.status ?? null,
        stable ? null : occurrence,
      ]),
    )
    .digest('hex');
}

export async function enqueueWhatsappNotification(message: Message, db: Database = prisma) {
  const orderId = Number(message.metadata.orderId);
  if (!Number.isSafeInteger(orderId) || orderId <= 0)
    return { sent: false, reason: 'invalid_order' } as const;
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { restaurantId: true },
  });
  if (
    !order ||
    (message.metadata.restaurantId != null &&
      Number(message.metadata.restaurantId) !== order.restaurantId)
  ) {
    return { sent: false, reason: 'order_scope_mismatch' } as const;
  }
  const id = randomUUID();
  const key = notificationKey(order.restaurantId, message.metadata);
  const payload = encryptCredential(JSON.stringify(message), context(id));
  await db.$executeRaw`INSERT INTO "NotificationOutbox" ("id", "deduplicationKey", "restaurantId", "payload")
    VALUES (${id}::uuid, ${key}, ${order.restaurantId}, ${payload}) ON CONFLICT ("deduplicationKey") DO NOTHING`;
  return { sent: false, queued: true, provider: 'whatsapp_webhook' } as const;
}

function configuredEndpoint() {
  const url = new URL(String(process.env.WHATSAPP_WEBHOOK_URL || ''));
  if (
    url.username ||
    url.password ||
    (url.protocol !== 'https:' &&
      !(
        process.env.NODE_ENV !== 'production' &&
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      ))
  ) {
    throw new Error('Webhook URL inválida.');
  }
  return url;
}

/** Durable retry, leased claims and a stable receiver idempotency key.
 * Delivery is at least once; a receiver must deduplicate Idempotency-Key.
 * No external call runs inside a database transaction.
 */
export async function deliverNotificationOutbox(db: Database = prisma, send: typeof fetch = fetch) {
  if (!process.env.WHATSAPP_WEBHOOK_URL) return { processed: 0 };
  const endpoint = configuredEndpoint();
  const token = String(process.env.WHATSAPP_WEBHOOK_TOKEN || '');
  const lockToken = randomUUID();
  const rows = await db.$queryRaw<Row[]>`
    WITH picked AS (SELECT "id" FROM "NotificationOutbox"
      WHERE "status" = 'PENDING' AND "availableAt" <= clock_timestamp()
        AND ("lockedUntil" IS NULL OR "lockedUntil" < clock_timestamp())
      ORDER BY "availableAt", "id" LIMIT 20 FOR UPDATE SKIP LOCKED)
    UPDATE "NotificationOutbox" n SET "lockedUntil" = clock_timestamp() + INTERVAL '2 minutes',
      "lockToken" = ${lockToken}::uuid, "attempts" = n."attempts" + 1 FROM picked WHERE n."id" = picked."id"
    RETURNING n."id", n."restaurantId", n."payload", n."attempts", n."createdAt"`;
  let delivered = 0;
  const processRow = async (row: Row) => {
    try {
      const message = JSON.parse(decryptCredential(row.payload, context(row.id)) || '') as Message;
      const settings = await db.restaurantSettings.findUnique({
        where: { restaurantId: row.restaurantId },
        select: { whatsappEnabled: true, receiveStatusNotifications: true },
      });
      const customerEvent = ['PAYMENT_CONFIRMED', 'ORDER_STATUS_CHANGED'].includes(
        String(message.metadata.event),
      );
      if (
        !settings ||
        settings.whatsappEnabled === false ||
        (customerEvent && settings.receiveStatusNotifications === false) ||
        Date.now() - row.createdAt.getTime() > 24 * 60 * 60 * 1000
      ) {
        await db.$executeRaw`UPDATE "NotificationOutbox" SET "status" = 'DISCARDED', "payload" = NULL,
          "completedAt" = clock_timestamp(), "lockedUntil" = NULL, "lockToken" = NULL
          WHERE "id" = ${row.id}::uuid AND "lockToken" = ${lockToken}::uuid`;
        return;
      }
      const response = await send(endpoint, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': row.id,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(message),
      });
      await response.body?.cancel();
      if (!response.ok) throw new Error('Webhook recusou a notificação.');
      await db.$executeRaw`UPDATE "NotificationOutbox" SET "status" = 'DELIVERED', "payload" = NULL,
        "completedAt" = clock_timestamp(), "lockedUntil" = NULL, "lockToken" = NULL
        WHERE "id" = ${row.id}::uuid AND "lockToken" = ${lockToken}::uuid`;
      delivered++;
    } catch {
      // Never persist/log the remote body, phone, message, credentials or driver errors.
      console.error('[NOTIFICATION_DELIVERY_RETRY]', { id: row.id, attempt: row.attempts });
      const exhausted = row.attempts >= 8;
      const delayMs = Math.min(30 * 60_000, 30_000 * 2 ** Math.min(row.attempts - 1, 6));
      await db.$executeRaw`UPDATE "NotificationOutbox" SET "status" = ${exhausted ? 'FAILED' : 'PENDING'},
        "availableAt" = clock_timestamp() + ${delayMs} * INTERVAL '1 millisecond',
        "lockedUntil" = NULL, "lockToken" = NULL, "payload" = CASE WHEN ${exhausted} THEN NULL ELSE "payload" END
        WHERE "id" = ${row.id}::uuid AND "lockToken" = ${lockToken}::uuid`;
    }
  };
  // Bound outgoing concurrency so a slow receiver cannot exhaust sockets.
  for (let i = 0; i < rows.length; i += 8) await Promise.all(rows.slice(i, i + 8).map(processRow));
  await db.$executeRaw`DELETE FROM "NotificationOutbox" WHERE "id" IN
    (SELECT "id" FROM "NotificationOutbox" WHERE "createdAt" < clock_timestamp() - INTERVAL '30 days' LIMIT 1000)`;
  return { processed: rows.length, delivered };
}

export async function drainNotificationOutbox() {
  const started = Date.now();
  let processed = 0;
  do {
    const batch = await deliverNotificationOutbox();
    processed += batch.processed;
    if (batch.processed < 20) break;
  } while (processed < 200 && Date.now() - started < 5_000);
  return { processed };
}
