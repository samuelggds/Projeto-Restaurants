import type { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';

type Database = Prisma.TransactionClient | typeof prisma;

const CONSENT_ACTION = 'WHATSAPP_ORDER_NOTIFICATIONS_OPT_IN';
const CONSENT_SCOPE = 'ORDER_TRANSACTIONAL_UPDATES';

function normalizeId(value: unknown) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function normalizePhone(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  if (/^55\d{10,11}$/u.test(digits)) return `+${digits}`;
  if (/^\d{10,11}$/u.test(digits)) return `+55${digits}`;
  return '';
}

function destinationPhoneFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';
  return normalizePhone((metadata as Record<string, unknown>).destinationPhone);
}

function resourceForOrder(orderId: number) {
  return `Order:${orderId}`;
}

export async function recordWhatsappOrderNotificationOptIn(
  input: {
    restaurantId: unknown;
    orderId: unknown;
    userId?: unknown;
    customerPhone?: unknown;
  },
  db: Database = prisma,
) {
  const restaurantId = normalizeId(input.restaurantId);
  const orderId = normalizeId(input.orderId);
  const userId = normalizeId(input.userId);
  const destinationPhone = normalizePhone(input.customerPhone);
  if (!restaurantId || !orderId || !destinationPhone) return false;

  const resource = resourceForOrder(orderId);
  const existing = await db.auditLog.findFirst({
    where: {
      restaurantId,
      action: CONSENT_ACTION,
      resource,
    },
    select: { id: true, metadata: true },
    orderBy: { id: 'desc' },
  });
  if (destinationPhoneFromMetadata(existing?.metadata) === destinationPhone) return true;

  await db.auditLog.create({
    data: {
      restaurantId,
      ...(userId ? { userId } : {}),
      userRole: 'CLIENTE',
      action: CONSENT_ACTION,
      resource,
      metadata: {
        channel: 'whatsapp',
        scope: CONSENT_SCOPE,
        source: 'CHECKOUT',
        destinationPhone,
        consentedAt: new Date().toISOString(),
      },
    },
  });
  return true;
}

export async function getWhatsappOrderNotificationDestination(
  restaurantIdInput: unknown,
  orderIdInput: unknown,
  db: Database = prisma,
) {
  const restaurantId = normalizeId(restaurantIdInput);
  const orderId = normalizeId(orderIdInput);
  if (!restaurantId || !orderId) return '';

  const consent = await db.auditLog.findFirst({
    where: {
      restaurantId,
      action: CONSENT_ACTION,
      resource: resourceForOrder(orderId),
    },
    select: { metadata: true },
    orderBy: { id: 'desc' },
  });

  return destinationPhoneFromMetadata(consent?.metadata);
}

export async function hasWhatsappOrderNotificationOptIn(
  restaurantIdInput: unknown,
  orderIdInput: unknown,
  db: Database = prisma,
) {
  return Boolean(
    await getWhatsappOrderNotificationDestination(restaurantIdInput, orderIdInput, db),
  );
}

export const WHATSAPP_ORDER_CONSENT_ACTION = CONSENT_ACTION;
