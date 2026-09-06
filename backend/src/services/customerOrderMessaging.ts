import prisma from '../config/prisma.js';
import { issueGuestOrderTrackingToken } from '../modules/orders/utils/guestOrderTrackingToken.js';

type CustomerOrderLinkInput = {
  restaurantId?: number | string | null;
  orderId?: number | string | null;
  publicId?: string | null;
};

export type CustomerOrderLinks = {
  storeUrl?: string;
  trackingUrl?: string;
  confirmationUrl?: string;
};

export type AutomaticOrderStatusMessageInput = CustomerOrderLinks & {
  customerName?: string | null;
  restaurantName?: string | null;
  orderId?: number | string | null;
  status?: string | null;
  orderType?: string | null;
};

function normalizeBaseUrl(value: string) {
  const raw = String(value || '').trim().replace(/\/+$/u, '');
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.origin + parsed.pathname.replace(/\/+$/u, '');
  } catch {
    return '';
  }
}

export function resolveCustomerAppBaseUrl() {
  const configured =
    process.env.PUBLIC_APP_URL ||
    process.env.FRONTEND_URL ||
    String(process.env.CORS_ORIGINS || '').split(',')[0] ||
    '';
  const normalized = normalizeBaseUrl(configured);
  if (normalized) return normalized;
  return process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173';
}

export function buildRestaurantStoreUrl(baseUrl: string, restaurantSlug: string) {
  const base = normalizeBaseUrl(baseUrl);
  const slug = String(restaurantSlug || '')
    .trim()
    .toLowerCase();
  if (!base || !/^[a-z0-9_-]+$/u.test(slug)) return '';
  return `${base}/${encodeURIComponent(slug)}`;
}

export function buildSecureOrderTrackingUrl({
  baseUrl,
  orderId,
  token,
  confirmation = false,
}: {
  baseUrl: string;
  orderId: number | string;
  token: string;
  confirmation?: boolean;
}) {
  const base = normalizeBaseUrl(baseUrl);
  const normalizedOrderId = Number(orderId);
  const normalizedToken = String(token || '').trim();
  if (!base || !Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0 || !normalizedToken) {
    return '';
  }
  const query = confirmation ? '?confirm=1' : '';
  // O token fica no fragmento: navegadores não o enviam em Referer ou na requisição HTTP inicial.
  return `${base}/orders/${normalizedOrderId}/tracking${query}#guestToken=${encodeURIComponent(normalizedToken)}`;
}

export async function resolveCustomerOrderLinks({
  restaurantId,
  orderId,
  publicId,
}: CustomerOrderLinkInput): Promise<CustomerOrderLinks> {
  const normalizedRestaurantId = Number(restaurantId || 0);
  const normalizedOrderId = Number(orderId || 0);
  const normalizedPublicId = String(publicId || '').trim();
  const baseUrl = resolveCustomerAppBaseUrl();

  if (!baseUrl || !Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
    return {};
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: normalizedRestaurantId },
    select: { slug: true },
  });
  const storeUrl = restaurant?.slug ? buildRestaurantStoreUrl(baseUrl, restaurant.slug) : '';

  if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0 || !normalizedPublicId) {
    return storeUrl ? { storeUrl } : {};
  }

  try {
    const guestToken = issueGuestOrderTrackingToken({
      orderId: normalizedOrderId,
      publicId: normalizedPublicId,
    });
    const trackingUrl = buildSecureOrderTrackingUrl({
      baseUrl,
      orderId: normalizedOrderId,
      token: guestToken,
    });
    const confirmationUrl = buildSecureOrderTrackingUrl({
      baseUrl,
      orderId: normalizedOrderId,
      token: guestToken,
      confirmation: true,
    });
    return {
      ...(storeUrl ? { storeUrl } : {}),
      ...(trackingUrl ? { trackingUrl } : {}),
      ...(confirmationUrl ? { confirmationUrl } : {}),
    };
  } catch (error) {
    console.error('[CUSTOMER_ORDER_LINK_ERROR]', {
      restaurantId: normalizedRestaurantId,
      orderId: normalizedOrderId,
      message: error instanceof Error ? error.message : String(error),
    });
    return storeUrl ? { storeUrl } : {};
  }
}

export function buildAutomaticOrderStatusMessage({
  customerName,
  restaurantName,
  orderId,
  status,
  orderType,
  trackingUrl,
  confirmationUrl,
}: AutomaticOrderStatusMessageInput) {
  const name = String(customerName || 'Cliente').trim() || 'Cliente';
  const restaurant = String(restaurantName || 'restaurante').trim() || 'restaurante';
  const code = String(orderId || '').trim() || '—';
  const normalizedStatus = String(status || 'EM_ANDAMENTO')
    .trim()
    .toUpperCase();
  const normalizedType = String(orderType || '').trim().toUpperCase();

  if (normalizedStatus === 'PENDENTE') {
    return `Oi, ${name}! ✅ Recebemos seu pedido #${code} no ${restaurant}. Em breve ele seguirá para o preparo.`;
  }
  if (normalizedStatus === 'PREPARANDO') {
    return `Oi, ${name}! 👨‍🍳 Seu pedido #${code} no ${restaurant} já está em preparo.`;
  }
  if (normalizedStatus === 'PRONTO') {
    return normalizedType === 'RETIRADA'
      ? `Oi, ${name}! ✅ Seu pedido #${code} está pronto para retirada no ${restaurant}.`
      : `Oi, ${name}! ✅ Seu pedido #${code} está pronto. Estamos preparando a próxima etapa.`;
  }
  if (normalizedStatus === 'SAIU_PARA_ENTREGA') {
    return [
      `Oi, ${name}! 🛵 Seu pedido #${code} saiu para entrega.`,
      trackingUrl ? `Acompanhe em tempo real: ${trackingUrl}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (normalizedStatus === 'ENTREGUE') {
    return [
      `Oi, ${name}! 📦 O pedido #${code} foi marcado como entregue.`,
      confirmationUrl ? `Confirme o recebimento com segurança: ${confirmationUrl}` : null,
      `Obrigado por pedir no ${restaurant}!`,
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (normalizedStatus === 'CANCELADO') {
    return `Oi, ${name}. O pedido #${code} no ${restaurant} foi cancelado. Se precisar de ajuda, fale com o restaurante.`;
  }

  return [
    `Oi, ${name}!`,
    `Atualização do seu pedido #${code} no ${restaurant}.`,
    `Novo status: ${normalizedStatus.replace(/_/gu, ' ')}.`,
  ].join('\n');
}
