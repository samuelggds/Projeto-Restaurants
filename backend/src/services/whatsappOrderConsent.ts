import type { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';

type Database = Prisma.TransactionClient | typeof prisma;

const CONSENT_ACTION = 'WHATSAPP_ORDER_NOTIFICATIONS_OPT_IN';
const CONSENT_SCOPE = 'ORDER_TRANSACTIONAL_UPDATES';

function normalizeId(value: unknown) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function resourceForOrder(orderId: number) {
  return `Order:${orderId}`;
}

export async function recordWhatsappOrderNotificationOptIn(
  input: {
    restaurantId: unknown;
    orderId: unknown;
    userId?: unknown;
  },
  db: Database = prisma,
) {
  const restaurantId = normalizeId(input.restaurantId);
  const orderId = normalizeId(input.orderId);
  const userId = normalizeId(input.userId);
  if (!restaurantId || !orderId) return false;

  const resource = resourceForOrder(orderId);
  const existing = await db.auditLog.findFirst({
    where: {
      restaurantId,
      action: CONSENT_ACTION,
      resource,
    },
    select: { id: true },
  });
  if (existing) return true;

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
        consentedAt: new Date().toISOString(),
      },
    },
  });
  return true;
}

export async function hasWhatsappOrderNotificationOptIn(
  restaurantIdInput: unknown,
  orderIdInput: unknown,
  db: Database = prisma,
) {
  const restaurantId = normalizeId(restaurantIdInput);
  const orderId = normalizeId(orderIdInput);
  if (!restaurantId || !orderId) return false;

  const consent = await db.auditLog.findFirst({
    where: {
      restaurantId,
      action: CONSENT_ACTION,
      resource: resourceForOrder(orderId),
    },
    select: { id: true },
  });
  return Boolean(consent);
}

export const WHATSAPP_ORDER_CONSENT_ACTION = CONSENT_ACTION;
