import prisma from '../config/prisma.js';
import { enqueueWhatsappSessionGreeting } from './notificationOutbox.js';
import { resolveGupshupSourceForAppName } from './whatsappProvider.js';

const PUBLIC_STORE_ORIGIN = 'https://www.gastronexa.com.br';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function digitsOnly(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeSlug(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/gu, '');
}

export function buildTenantStoreUrl(slugInput: unknown) {
  const slug = normalizeSlug(slugInput);
  return slug ? `${PUBLIC_STORE_ORIGIN}/${slug}` : PUBLIC_STORE_ORIGIN;
}

export function buildTenantWhatsappGreeting(input: {
  configuredMessage?: unknown;
  restaurantName?: unknown;
  restaurantSlug?: unknown;
}) {
  const restaurantName = String(input.restaurantName || 'restaurante').trim() || 'restaurante';
  const configured = String(input.configuredMessage || '').trim();
  const message = configured || `Olá! 👋 Bem-vindo ao ${restaurantName}. Como podemos ajudar?`;
  return `${message}\n\n${buildTenantStoreUrl(input.restaurantSlug)}`;
}

export type GupshupInboundMessage = {
  appName: string;
  providerMessageId: string;
  customerPhone: string;
  messageType: string;
};

export function parseGupshupInboundMessage(bodyInput: unknown): GupshupInboundMessage | null {
  const body = asRecord(bodyInput);
  if (String(body.type || '').trim().toLowerCase() !== 'message') return null;

  const payload = asRecord(body.payload);
  const appName = String(body.app || '').trim();
  const customerPhone = digitsOnly(payload.source || asRecord(payload.sender).phone);
  const providerMessageId = String(payload.id || '').trim();
  const messageType = String(payload.type || '').trim().toLowerCase();

  if (!appName || !/^\d{10,15}$/u.test(customerPhone)) return null;
  return { appName, providerMessageId, customerPhone, messageType };
}

export async function processGupshupInboundGreeting(bodyInput: unknown) {
  const incoming = parseGupshupInboundMessage(bodyInput);
  if (!incoming) return { accepted: true, queued: false, reason: 'event_ignored' } as const;

  const restaurantWhatsapp = resolveGupshupSourceForAppName(incoming.appName);
  const restaurant = await prisma.restaurant.findFirst({
    where: { whatsapp: restaurantWhatsapp },
    select: {
      id: true,
      name: true,
      slug: true,
      whatsapp: true,
      settings: {
        select: {
          whatsappEnabled: true,
          whatsappDefaultMessage: true,
        },
      },
    },
  });

  if (!restaurant || !restaurant.settings || restaurant.settings.whatsappEnabled === false) {
    return { accepted: true, queued: false, reason: 'tenant_whatsapp_not_enabled' } as const;
  }

  const greeting = buildTenantWhatsappGreeting({
    configuredMessage: restaurant.settings.whatsappDefaultMessage,
    restaurantName: restaurant.name,
    restaurantSlug: restaurant.slug,
  });

  const result = await enqueueWhatsappSessionGreeting({
    restaurantId: restaurant.id,
    from: restaurant.whatsapp || restaurantWhatsapp,
    to: incoming.customerPhone,
    message: greeting,
    providerMessageId: incoming.providerMessageId,
  });

  return {
    accepted: true,
    queued: result.queued,
    duplicate: 'duplicate' in result ? result.duplicate : false,
    reason: 'reason' in result ? result.reason : null,
  } as const;
}
