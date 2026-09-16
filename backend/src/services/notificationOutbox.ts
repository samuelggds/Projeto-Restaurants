import { createHash, randomUUID } from 'node:crypto';
import prisma from '../config/prisma.js';
import {
  encryptCredential,
  decryptCredential,
} from '../modules/restaurantSettings/security/credentialEncryption.js';
import {
  resolveGupshupAutomaticTemplateMode,
  resolveGupshupTemplateId,
  resolveWhatsAppDeliveryProvider,
  sendGupshupTemplateMessage,
  sendGupshupTextMessage,
  type GupshupTemplateKey,
  WhatsAppProviderConfigurationError,
} from './whatsappProvider.js';

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
const digitsOnly = (value: unknown) => String(value || '').replace(/\D/g, '');
const CUSTOMER_EVENTS = new Set(['PAYMENT_CONFIRMED', 'ORDER_STATUS_CHANGED']);
const IMMEDIATE_ORDER_STATUSES = new Set(['SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO']);
const RECIPIENT_KEY_LENGTH = 20;
const ORDER_KEY_LENGTH = 12;
const CLASS_KEY_LENGTH = 2;
const THROTTLED_CLASS = 'T0';
const PRIORITY_CLASS = 'P1';
const AUTOMATIC_MESSAGE_MIN_INTERVAL_MS = 60_000;

function hashSegment(value: unknown, length: number) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, length);
}

function isCustomerAutomaticEvent(metadata: Record<string, unknown>) {
  return CUSTOMER_EVENTS.has(String(metadata.event || '').trim().toUpperCase());
}

export function shouldThrottleCustomerAutomaticMessage(metadata: Record<string, unknown>) {
  const event = String(metadata.event || '').trim().toUpperCase();
  if (event !== 'ORDER_STATUS_CHANGED') return false;

  const status = String(metadata.status || '').trim().toUpperCase();
  if (status === 'PREPARANDO') return true;
  if (status === 'PRONTO') {
    return String(metadata.orderType || '').trim().toUpperCase() !== 'RETIRADA';
  }
  return !IMMEDIATE_ORDER_STATUSES.has(status);
}

function shouldSupersedeThrottledOrderMessages(metadata: Record<string, unknown>) {
  const event = String(metadata.event || '').trim().toUpperCase();
  if (event !== 'ORDER_STATUS_CHANGED') return false;
  return !shouldThrottleCustomerAutomaticMessage(metadata);
}

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

function customerQueueIdentity(
  restaurantId: number,
  destination: string,
  metadata: Record<string, unknown>,
) {
  if (!isCustomerAutomaticEvent(metadata)) return null;
  const normalizedDestination = digitsOnly(destination);
  if (!/^\d{10,15}$/u.test(normalizedDestination)) return null;

  const recipientKey = hashSegment(`${restaurantId}:${normalizedDestination}`, RECIPIENT_KEY_LENGTH);
  const orderId = Number(metadata.orderId);
  const orderKey =
    Number.isSafeInteger(orderId) && orderId > 0
      ? hashSegment(`${restaurantId}:${orderId}`, ORDER_KEY_LENGTH)
      : '0'.repeat(ORDER_KEY_LENGTH);
  const throttled = shouldThrottleCustomerAutomaticMessage(metadata);
  const classKey = throttled ? THROTTLED_CLASS : PRIORITY_CLASS;
  const eventKey = notificationKey(restaurantId, metadata).slice(
    0,
    64 - RECIPIENT_KEY_LENGTH - ORDER_KEY_LENGTH - CLASS_KEY_LENGTH,
  );

  return {
    key: `${recipientKey}${orderKey}${classKey}${eventKey}`,
    recipientKey,
    orderKey,
    throttled,
    supersedesThrottled: shouldSupersedeThrottledOrderMessages(metadata),
  };
}

function sessionGreetingKey(restaurantId: number, destination: string, bucket: number) {
  return createHash('sha256')
    .update(JSON.stringify([restaurantId, 'INBOUND_GREETING', digitsOnly(destination), bucket]))
    .digest('hex');
}

function encryptedPayload(message: Message, id: string) {
  return encryptCredential(JSON.stringify(message), context(id));
}

async function insertOutbox(
  db: Database,
  restaurantId: number,
  key: string,
  message: Message,
) {
  const id = randomUUID();
  const payload = encryptedPayload(message, id);
  const inserted = await db.$executeRaw`INSERT INTO "NotificationOutbox" ("id", "deduplicationKey", "restaurantId", "payload")
    VALUES (${id}::uuid, ${key}, ${restaurantId}, ${payload}) ON CONFLICT ("deduplicationKey") DO NOTHING`;
  return inserted > 0;
}

async function insertImmediateCustomerOutbox(
  db: Database,
  restaurantId: number,
  key: string,
  recipientKey: string,
  message: Message,
) {
  const id = randomUUID();
  const payload = encryptedPayload(message, id);
  const lockKey = `${restaurantId}:${recipientKey}`;
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    WITH guard AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
    )
    INSERT INTO "NotificationOutbox" ("id", "deduplicationKey", "restaurantId", "payload", "availableAt")
    SELECT ${id}::uuid, ${key}, ${restaurantId}, ${payload}, clock_timestamp()
    FROM guard
    ON CONFLICT ("deduplicationKey") DO NOTHING
    RETURNING "id"`;
  return rows.length > 0;
}

async function insertPriorityCustomerOutbox(
  db: Database,
  restaurantId: number,
  key: string,
  recipientKey: string,
  orderKey: string,
  message: Message,
) {
  const id = randomUUID();
  const payload = encryptedPayload(message, id);
  const lockKey = `${restaurantId}:${recipientKey}`;
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    WITH guard AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
    ), discarded AS (
      UPDATE "NotificationOutbox" n
      SET "status" = 'DISCARDED', "payload" = NULL, "completedAt" = clock_timestamp(),
        "lockedUntil" = NULL, "lockToken" = NULL
      FROM guard
      WHERE n."restaurantId" = ${restaurantId}
        AND LEFT(n."deduplicationKey", ${RECIPIENT_KEY_LENGTH}::int) = ${recipientKey}
        AND SUBSTRING(n."deduplicationKey" FROM ${RECIPIENT_KEY_LENGTH + 1}::int FOR ${ORDER_KEY_LENGTH}::int) = ${orderKey}
        AND SUBSTRING(n."deduplicationKey" FROM ${RECIPIENT_KEY_LENGTH + ORDER_KEY_LENGTH + 1}::int FOR ${CLASS_KEY_LENGTH}::int) = ${THROTTLED_CLASS}
        AND n."status" = 'PENDING'
      RETURNING n."id"
    )
    INSERT INTO "NotificationOutbox" ("id", "deduplicationKey", "restaurantId", "payload", "availableAt")
    SELECT ${id}::uuid, ${key}, ${restaurantId}, ${payload}, clock_timestamp()
    FROM guard
    ON CONFLICT ("deduplicationKey") DO NOTHING
    RETURNING "id"`;
  return rows.length > 0;
}

async function insertThrottledCustomerOutbox(
  db: Database,
  restaurantId: number,
  key: string,
  recipientKey: string,
  message: Message,
) {
  const id = randomUUID();
  const payload = encryptedPayload(message, id);
  const lockKey = `${restaurantId}:${recipientKey}`;
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    WITH guard AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
    ), latest AS (
      SELECT CASE
        WHEN MAX(
          CASE
            WHEN n."status" = 'PENDING' THEN n."availableAt"
            WHEN n."status" = 'DELIVERED' THEN n."completedAt"
            ELSE NULL
          END
        ) IS NULL THEN clock_timestamp()
        ELSE GREATEST(
          clock_timestamp(),
          MAX(
            CASE
              WHEN n."status" = 'PENDING' THEN n."availableAt"
              WHEN n."status" = 'DELIVERED' THEN n."completedAt"
              ELSE NULL
            END
          ) + ${AUTOMATIC_MESSAGE_MIN_INTERVAL_MS} * INTERVAL '1 millisecond'
        )
      END AS slot
      FROM guard
      LEFT JOIN "NotificationOutbox" n
        ON n."restaurantId" = ${restaurantId}
       AND LEFT(n."deduplicationKey", ${RECIPIENT_KEY_LENGTH}::int) = ${recipientKey}
       AND n."status" IN ('PENDING', 'DELIVERED')
       AND n."createdAt" > clock_timestamp() - INTERVAL '24 hours'
    )
    INSERT INTO "NotificationOutbox" ("id", "deduplicationKey", "restaurantId", "payload", "availableAt")
    SELECT ${id}::uuid, ${key}, ${restaurantId}, ${payload}, latest.slot
    FROM latest
    ON CONFLICT ("deduplicationKey") DO NOTHING
    RETURNING "id"`;
  return rows.length > 0;
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

  const identity = customerQueueIdentity(order.restaurantId, message.to, message.metadata);
  let inserted: boolean;
  if (!identity) {
    const key = notificationKey(order.restaurantId, message.metadata);
    inserted = await insertOutbox(db, order.restaurantId, key, message);
  } else if (identity.throttled) {
    inserted = await insertThrottledCustomerOutbox(
      db,
      order.restaurantId,
      identity.key,
      identity.recipientKey,
      message,
    );
  } else if (identity.supersedesThrottled) {
    inserted = await insertPriorityCustomerOutbox(
      db,
      order.restaurantId,
      identity.key,
      identity.recipientKey,
      identity.orderKey,
      message,
    );
  } else {
    inserted = await insertImmediateCustomerOutbox(
      db,
      order.restaurantId,
      identity.key,
      identity.recipientKey,
      message,
    );
  }

  return {
    sent: false,
    queued: inserted,
    duplicate: !inserted,
    provider: resolveWhatsAppDeliveryProvider(),
  } as const;
}

export async function enqueueWhatsappSessionGreeting({
  restaurantId,
  from,
  to,
  message,
  providerMessageId,
  receivedAt = new Date(),
  db = prisma,
}: {
  restaurantId: number;
  from: string;
  to: string;
  message: string;
  providerMessageId?: string | null;
  receivedAt?: Date;
  db?: Database;
}) {
  if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) {
    return { sent: false, queued: false, reason: 'invalid_restaurant' } as const;
  }
  const source = digitsOnly(from);
  const destination = digitsOnly(to);
  if (!/^\d{10,15}$/u.test(source) || !/^\d{10,15}$/u.test(destination)) {
    return { sent: false, queued: false, reason: 'invalid_phone' } as const;
  }

  const settings = await db.restaurantSettings.findUnique({
    where: { restaurantId },
    select: {
      whatsappEnabled: true,
      restaurant: { select: { whatsapp: true } },
    },
  });
  if (!settings || settings.whatsappEnabled === false) {
    return { sent: false, queued: false, reason: 'whatsapp_disabled' } as const;
  }
  if (digitsOnly(settings.restaurant?.whatsapp) !== source) {
    return { sent: false, queued: false, reason: 'restaurant_whatsapp_mismatch' } as const;
  }

  const conversationBucket = Math.floor(receivedAt.getTime() / (24 * 60 * 60 * 1000));
  const key = sessionGreetingKey(restaurantId, destination, conversationBucket);
  const inserted = await insertOutbox(db, restaurantId, key, {
    channel: 'whatsapp',
    from: source,
    to: destination,
    message: String(message || '').trim(),
    metadata: {
      event: 'INBOUND_GREETING',
      restaurantId,
      providerMessageId: String(providerMessageId || '').trim() || null,
      conversationBucket,
    },
  });

  return {
    sent: false,
    queued: inserted,
    duplicate: !inserted,
    provider: resolveWhatsAppDeliveryProvider(),
  } as const;
}

function configuredWebhookEndpoint() {
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

async function sendLegacyWebhook(message: Message, rowId: string, send: typeof fetch) {
  const endpoint = configuredWebhookEndpoint();
  const token = String(process.env.WHATSAPP_WEBHOOK_TOKEN || '');
  const response = await send(endpoint, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': rowId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(message),
  });
  await response.body?.cancel();
  if (!response.ok) throw new Error('Webhook recusou a notificação.');
}

function resolveTemplateKey(message: Message): GupshupTemplateKey | null {
  const event = String(message.metadata.event || '').toUpperCase();
  if (event === 'PAYMENT_CONFIRMED') return 'PAYMENT_CONFIRMED';
  if (event !== 'ORDER_STATUS_CHANGED') return null;

  const status = String(message.metadata.status || '').toUpperCase();
  if (status === 'PENDENTE') return 'ORDER_PENDING';
  if (status === 'PREPARANDO') return 'ORDER_PREPARING';
  if (status === 'PRONTO') return 'ORDER_READY';
  if (status === 'SAIU_PARA_ENTREGA') return 'ORDER_OUT_FOR_DELIVERY';
  if (status === 'ENTREGUE') return 'ORDER_DELIVERED';
  if (status === 'CANCELADO') return 'ORDER_CANCELLED';
  return null;
}

function templateParams(message: Message) {
  const configured = message.metadata.templateParams;
  return Array.isArray(configured)
    ? configured.map((value) => String(value ?? ''))
    : [String(message.message || '')];
}

async function deliverGupshup(message: Message, send: typeof fetch) {
  const mode = resolveGupshupAutomaticTemplateMode();
  const templateKey = resolveTemplateKey(message);
  if (mode !== 'disabled' && templateKey) {
    const templateId = resolveGupshupTemplateId(message.from, templateKey);
    if (templateId) {
      await sendGupshupTemplateMessage({
        source: message.from,
        destination: message.to,
        templateId,
        params: templateParams(message),
        send,
      });
      return;
    }
    if (mode === 'required') {
      throw new WhatsAppProviderConfigurationError(
        'gupshup_template_not_configured',
        `Template ${templateKey} não configurado para a notificação automática.`,
      );
    }
  }

  await sendGupshupTextMessage({
    source: message.from,
    destination: message.to,
    message: message.message,
    send,
  });
}

async function deliverMessage(
  restaurantId: number,
  message: Message,
  rowId: string,
  send: typeof fetch,
) {
  const provider = resolveWhatsAppDeliveryProvider();
  if (provider === 'evolution') {
    const { sendTenantEvolutionTextMessage } = await import('./evolutionTenantWhatsapp.js');
    await sendTenantEvolutionTextMessage({
      restaurantId,
      destination: message.to,
      message: message.message,
    });
    return;
  }
  if (provider === 'zapi') {
    const { sendTenantZapiTextMessage } = await import('./zapiTenantWhatsapp.js');
    await sendTenantZapiTextMessage({
      restaurantId,
      destination: message.to,
      message: message.message,
    });
    return;
  }
  if (provider === 'gupshup') {
    await deliverGupshup(message, send);
    return;
  }
  if (provider === 'whatsapp_webhook') {
    if (!String(process.env.WHATSAPP_WEBHOOK_URL || '').trim()) {
      throw new WhatsAppProviderConfigurationError(
        'whatsapp_webhook_missing',
        'WHATSAPP_WEBHOOK_URL não configurada.',
      );
    }
    await sendLegacyWebhook(message, rowId, send);
    return;
  }
  throw new WhatsAppProviderConfigurationError(
    provider === 'none' ? 'provider_not_configured' : 'provider_not_supported',
    `Provedor de WhatsApp não suportado: ${provider}.`,
  );
}

async function discardNotificationsWithoutConsent(db: Database) {
  return db.$executeRaw`
    WITH picked AS (
      SELECT n."id"
      FROM "NotificationOutbox" n
      JOIN "RestaurantSettings" s ON s."restaurantId" = n."restaurantId"
      WHERE n."status" = 'PENDING'
        AND (n."lockedUntil" IS NULL OR n."lockedUntil" < clock_timestamp())
        AND (
          s."whatsappEnabled" IS FALSE
          OR (
            s."receiveStatusNotifications" IS FALSE
            AND SUBSTRING(
              n."deduplicationKey"
              FROM ${RECIPIENT_KEY_LENGTH + ORDER_KEY_LENGTH + 1}::int
              FOR ${CLASS_KEY_LENGTH}::int
            ) IN (${THROTTLED_CLASS}, ${PRIORITY_CLASS})
          )
        )
      ORDER BY n."createdAt", n."id"
      LIMIT 1000
      FOR UPDATE OF n SKIP LOCKED
    )
    UPDATE "NotificationOutbox" n
    SET "status" = 'DISCARDED',
      "payload" = NULL,
      "completedAt" = clock_timestamp(),
      "lockedUntil" = NULL,
      "lockToken" = NULL
    FROM picked
    WHERE n."id" = picked."id"`;
}

export async function deliverNotificationOutbox(db: Database = prisma, send: typeof fetch = fetch) {
  if (resolveWhatsAppDeliveryProvider() === 'none') return { processed: 0, delivered: 0 };

  const consentDiscarded = await discardNotificationsWithoutConsent(db);
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

      await deliverMessage(row.restaurantId, message, row.id, send);
      await db.$executeRaw`UPDATE "NotificationOutbox" SET "status" = 'DELIVERED', "payload" = NULL,
        "completedAt" = clock_timestamp(), "lockedUntil" = NULL, "lockToken" = NULL
        WHERE "id" = ${row.id}::uuid AND "lockToken" = ${lockToken}::uuid`;
      delivered++;
    } catch (error) {
      const configurationError = error instanceof WhatsAppProviderConfigurationError;
      console.error('[NOTIFICATION_DELIVERY_RETRY]', {
        id: row.id,
        attempt: row.attempts,
        kind: configurationError ? error.code : 'remote_delivery_error',
      });
      const exhausted = configurationError || row.attempts >= 8;
      const delayMs = Math.min(30 * 60_000, 30_000 * 2 ** Math.min(row.attempts - 1, 6));
      await db.$executeRaw`UPDATE "NotificationOutbox" SET "status" = ${exhausted ? 'FAILED' : 'PENDING'},
        "availableAt" = clock_timestamp() + ${delayMs} * INTERVAL '1 millisecond',
        "lockedUntil" = NULL, "lockToken" = NULL, "payload" = CASE WHEN ${exhausted} THEN NULL ELSE "payload" END
        WHERE "id" = ${row.id}::uuid AND "lockToken" = ${lockToken}::uuid`;
    }
  };
  for (let i = 0; i < rows.length; i += 8) await Promise.all(rows.slice(i, i + 8).map(processRow));
  await db.$executeRaw`DELETE FROM "NotificationOutbox" WHERE "id" IN
    (SELECT "id" FROM "NotificationOutbox" WHERE "createdAt" < clock_timestamp() - INTERVAL '30 days' LIMIT 1000)`;
  return { processed: consentDiscarded + rows.length, delivered };
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
