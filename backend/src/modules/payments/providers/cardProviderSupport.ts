import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import type {
  DirectCardPaymentOrder,
  DirectCardPaymentRequest,
} from '../domain/DirectCardPaymentProvider.js';
import { CardPaymentDeclinedError } from '../domain/paymentErrors.js';
import type { CardProvider } from './providerCatalog.js';

export function digits(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

export function amount(value: unknown) {
  const normalized = Number(value || 0);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error('Valor inválido para pagamento com cartão.');
  }
  return Number(normalized.toFixed(2));
}

export function internalReturnUrl(
  baseUrl: string,
  order: DirectCardPaymentOrder,
  status: 'success' | 'pending',
) {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('cardCheckoutStatus', status);
    url.searchParams.set('orderPublicId', order.publicId);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export function providerErrorItems(body: Record<string, unknown>) {
  if (Array.isArray(body.cause)) return body.cause;
  if (Array.isArray(body.error_messages)) return body.error_messages;
  if (Array.isArray(body.errors)) return body.errors;
  return [];
}

export function providerErrorCode(body: Record<string, unknown>) {
  const first = providerErrorItems(body)[0] as { code?: unknown } | undefined;
  return String(first?.code || body.code || body.error || '')
    .trim()
    .toLowerCase();
}

export function safeProviderMessage(body: Record<string, unknown>, fallback: string) {
  const first = providerErrorItems(body)[0] as
    | { description?: unknown; message?: unknown; code?: unknown }
    | undefined;
  return String(first?.description || first?.message || body.message || fallback)
    .replace(/\b\d{13,19}\b/g, '[cartão protegido]')
    .replace(/(?:APP_USR|TEST)-[A-Za-z0-9_-]+/g, '[credencial protegida]')
    .slice(0, 220);
}

export function splitConfigurationError(value: unknown) {
  const text = String(value || '').toLowerCase();
  return (
    text.includes('marketplace_fee') ||
    text.includes('application_fee') ||
    text.includes('marketplace') ||
    text.includes('split') ||
    text.includes('wallet')
  );
}

export async function readResponse(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export async function payerEmail(
  payload: DirectCardPaymentRequest,
  order: DirectCardPaymentOrder,
) {
  const userId = Number(payload.userId || 0);
  if (Number.isSafeInteger(userId) && userId > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const email = String(user?.email || '').trim();
    if (email.includes('@')) return email;
  }
  return `guest.card.${order.restaurantId}.${order.id}@gastronexa.local`;
}

export async function savedMethod(
  payload: DirectCardPaymentRequest,
  order: DirectCardPaymentOrder,
  provider: CardProvider,
) {
  const publicId = String(payload.paymentMethodId || '').trim();
  if (!publicId) return null;
  const userId = Number(payload.userId || 0);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new CardPaymentDeclinedError('Entre na sua conta para usar um cartão salvo.');
  }
  return withTenantDbContext(order.restaurantId, (db) =>
    db.customerPaymentMethod.findFirst({
      where: {
        publicId,
        userId,
        restaurantId: order.restaurantId,
        provider,
        active: true,
      },
    }),
  );
}
