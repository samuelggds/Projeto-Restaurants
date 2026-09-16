import prisma from '../config/prisma.js';
import { enqueueWhatsappNotification } from './notificationOutbox.js';
import { resolveWhatsAppDeliveryProvider } from './whatsappProvider.js';
import { hasWhatsappOrderNotificationOptIn } from './whatsappOrderConsent.js';
import { generateDeliveryConfirmationCode } from '../modules/orders/utils/deliveryConfirmationCode.js';
import {
  buildAutomaticOrderStatusMessage,
  resolveCustomerOrderLinks,
} from './customerOrderMessaging.js';

type PaymentConfirmedPayload = {
  restaurantId?: number | string | null;
  restaurantWhatsapp?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  restaurantName?: string | null;
  orderId?: number | string | null;
  total?: number | string | { toString(): string } | null;
  paymentMethod?: string | null;
};

type OrderStatusChangedPayload = {
  restaurantId?: number | string | null;
  restaurantWhatsapp?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  restaurantName?: string | null;
  orderId?: number | string | null;
  publicId?: string | null;
  orderType?: string | null;
  status?: string | null;
  deliveryStartedAt?: Date | string | null;
};

type RestaurantPinRequestedPayload = {
  restaurantWhatsapp?: string | null;
  restaurantName?: string | null;
  orderId?: number | string | null;
  requestedByRole?: string | null;
};

type RestaurantOrderIssueReportedPayload = {
  restaurantWhatsapp?: string | null;
  restaurantName?: string | null;
  orderId?: number | string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  issueMessage?: string | null;
  orderStatus?: string | null;
  orderType?: string | null;
  paymentMethod?: string | null;
  total?: number | string | { toString(): string } | null;
  addressLabel?: string | null;
  itemsSummary?: string[] | null;
  createdAt?: string | null;
};

type CustomerWhatsappPreference = {
  enabled: boolean;
  reason?:
    | 'restaurant_settings_not_found'
    | 'whatsapp_disabled'
    | 'status_notifications_disabled'
    | 'notification_preference_lookup_failed';
};

const SUPPORTED_QUEUE_PROVIDERS = new Set([
  'whatsapp_webhook',
  'gupshup',
  'zapi',
  'evolution',
]);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.name : 'UnknownError';
}

async function resolveCustomerWhatsappPreference(
  restaurantId: number | string | null | undefined,
): Promise<CustomerWhatsappPreference> {
  if (restaurantId === undefined || restaurantId === null || restaurantId === '') {
    return { enabled: true };
  }

  const normalizedRestaurantId = Number(restaurantId);
  if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
    console.error('[CUSTOMER_NOTIFICATION_SETTINGS_ERROR]', {
      restaurantId,
      message: 'restaurantId inválido',
    });
    return { enabled: false, reason: 'notification_preference_lookup_failed' };
  }

  try {
    const settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId: normalizedRestaurantId },
      select: {
        whatsappEnabled: true,
        receiveStatusNotifications: true,
      },
    });

    if (!settings) return { enabled: false, reason: 'restaurant_settings_not_found' };
    if ('whatsappEnabled' in settings && settings.whatsappEnabled === false) {
      return { enabled: false, reason: 'whatsapp_disabled' };
    }
    if ('receiveStatusNotifications' in settings && settings.receiveStatusNotifications === false) {
      return { enabled: false, reason: 'status_notifications_disabled' };
    }
    return { enabled: true };
  } catch (error) {
    console.error('[CUSTOMER_NOTIFICATION_SETTINGS_ERROR]', {
      restaurantId: normalizedRestaurantId,
      message: getErrorMessage(error),
    });
    return { enabled: false, reason: 'notification_preference_lookup_failed' };
  }
}

async function hasCustomerOrderWhatsappConsent(
  restaurantId: number | string | null | undefined,
  orderId: number | string | null | undefined,
) {
  try {
    return await hasWhatsappOrderNotificationOptIn(restaurantId, orderId);
  } catch (error) {
    console.error('[CUSTOMER_NOTIFICATION_CONSENT_ERROR]', {
      restaurantId,
      orderId,
      message: getErrorMessage(error),
    });
    return false;
  }
}

function resolveProvider() {
  return resolveWhatsAppDeliveryProvider();
}

function providerSupported(provider: string) {
  return SUPPORTED_QUEUE_PROVIDERS.has(provider);
}

function normalizeToE164Br(phone: string | number | null | undefined) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (/^55\d{10,11}$/u.test(digits)) return `+${digits}`;
  if (/^\d{10,11}$/u.test(digits)) return `+55${digits}`;
  return '';
}

function formatCurrencyBrl(value: number | string | { toString(): string } | null | undefined) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number.isFinite(amount) ? amount : 0,
  );
}

function buildCustomerPaymentMessage({
  customerName,
  restaurantName,
  orderId,
  total,
  paymentMethod,
}: PaymentConfirmedPayload) {
  const name = String(customerName || 'Cliente').trim();
  const restaurant = String(restaurantName || 'restaurante').trim();
  const method = String(paymentMethod || 'PIX').toUpperCase();
  return [
    `Oi, ${name}! ✅ Seu pagamento via ${method} foi confirmado.`,
    `Pedido #${orderId} no ${restaurant}.`,
    `Total: ${formatCurrencyBrl(total)}.`,
    'Agora é só aguardar o preparo.',
  ].join('\n');
}

function buildRestaurantPinRequestMessage({
  restaurantName,
  orderId,
  requestedByRole,
}: RestaurantPinRequestedPayload) {
  const restaurant = String(restaurantName || 'restaurante').trim();
  const requester =
    String(requestedByRole || 'MOTOQUEIRO').toUpperCase() === 'ADMIN' ? 'Admin' : 'Motoqueiro';
  return [
    `Notificação - ${restaurant}`,
    `${requester} solicitou PIN de confirmação de pagamento.`,
    `Pedido #${orderId}.`,
  ].join('\n');
}

function buildRestaurantIssueMessage({
  restaurantName,
  orderId,
  customerName,
  customerPhone,
  issueMessage,
  orderStatus,
  orderType,
  paymentMethod,
  total,
  addressLabel,
  itemsSummary,
  createdAt,
}: RestaurantOrderIssueReportedPayload) {
  const lines = [
    `Notificação - ${String(restaurantName || 'restaurante').trim()}`,
    `Cliente ${String(customerName || 'Cliente').trim()} relatou problema no pedido #${orderId}.`,
    customerPhone ? `Telefone do cliente: ${customerPhone}.` : null,
    `Status: ${String(orderStatus || 'N/A').replace(/_/gu, ' ').toUpperCase()} | Tipo: ${String(orderType || 'N/A').replace(/_/gu, ' ').toUpperCase()} | Pagamento: ${String(paymentMethod || 'N/A').replace(/_/gu, ' ').toUpperCase()}.`,
    `Total: ${formatCurrencyBrl(total)}.`,
    addressLabel ? `Endereço: ${addressLabel}.` : null,
    Array.isArray(itemsSummary) && itemsSummary.length
      ? `Itens: ${itemsSummary.slice(0, 8).join('; ')}.`
      : null,
    `Criado em: ${createdAt ? new Date(createdAt).toLocaleString('pt-BR') : 'N/A'}.`,
    `Mensagem: ${String(issueMessage || '').trim().slice(0, 600) || '(sem detalhes)'}`,
  ];
  return lines.filter(Boolean).join('\n');
}

async function queueWhatsappMessage({
  restaurantWhatsapp,
  destination,
  message,
  metadata,
}: {
  restaurantWhatsapp?: string | null;
  destination?: string | null;
  message: string;
  metadata: Record<string, unknown>;
}) {
  const provider = resolveProvider();
  if (provider === 'none') return { sent: false, reason: 'provider_not_configured' } as const;
  if (!providerSupported(provider)) {
    return { sent: false, reason: 'provider_not_supported', provider } as const;
  }

  const from = normalizeToE164Br(restaurantWhatsapp);
  if (!from) return { sent: false, reason: 'restaurant_whatsapp_not_configured' } as const;
  const to = normalizeToE164Br(destination);
  if (!to) return { sent: false, reason: 'invalid_or_missing_phone' } as const;

  return enqueueWhatsappNotification({
    channel: 'whatsapp',
    from,
    to,
    message,
    metadata: { ...metadata, restaurantWhatsapp: from, provider },
  });
}

export async function notifyCustomerPaymentConfirmed(payload: PaymentConfirmedPayload) {
  const preference = await resolveCustomerWhatsappPreference(payload.restaurantId);
  if (!preference.enabled) return { sent: false, reason: preference.reason };
  if (!(await hasCustomerOrderWhatsappConsent(payload.restaurantId, payload.orderId))) {
    return { sent: false, reason: 'customer_whatsapp_opt_in_missing' } as const;
  }
  const provider = resolveProvider();
  if (provider === 'none') return { sent: false, reason: 'provider_not_configured' };
  if (!providerSupported(provider)) {
    return { sent: false, reason: 'provider_not_supported', provider };
  }

  try {
    const name = String(payload.customerName || 'Cliente').trim() || 'Cliente';
    const restaurant = String(payload.restaurantName || 'restaurante').trim() || 'restaurante';
    const method = String(payload.paymentMethod || 'PIX').toUpperCase();
    const total = formatCurrencyBrl(payload.total);
    return await queueWhatsappMessage({
      restaurantWhatsapp: payload.restaurantWhatsapp,
      destination: payload.customerPhone,
      message: buildCustomerPaymentMessage(payload),
      metadata: {
        restaurantId: payload.restaurantId,
        orderId: payload.orderId,
        event: 'PAYMENT_CONFIRMED',
        templateParams: [name, method, String(payload.orderId || ''), restaurant, total],
      },
    });
  } catch (error) {
    console.error('[CUSTOMER_NOTIFICATION_ERROR]', getErrorMessage(error));
    return { sent: false, reason: 'send_failed', provider };
  }
}

export async function notifyCustomerOrderStatusChanged(payload: OrderStatusChangedPayload) {
  const preference = await resolveCustomerWhatsappPreference(payload.restaurantId);
  if (!preference.enabled) return { sent: false, reason: preference.reason };
  if (!(await hasCustomerOrderWhatsappConsent(payload.restaurantId, payload.orderId))) {
    return { sent: false, reason: 'customer_whatsapp_opt_in_missing' } as const;
  }

  const normalizedStatus = String(payload.status || '').trim().toUpperCase();
  if (normalizedStatus === 'PENDENTE') {
    return { sent: false, reason: 'initial_status_suppressed' } as const;
  }

  const provider = resolveProvider();
  if (provider === 'none') return { sent: false, reason: 'provider_not_configured' };
  if (!providerSupported(provider)) {
    return { sent: false, reason: 'provider_not_supported', provider };
  }

  try {
    const links = await resolveCustomerOrderLinks({
      restaurantId: payload.restaurantId,
      orderId: payload.orderId,
      publicId: payload.publicId,
    });

    let deliveryConfirmationCode: string | undefined;
    if (
      normalizedStatus === 'SAIU_PARA_ENTREGA' &&
      payload.publicId &&
      payload.deliveryStartedAt &&
      Number.isInteger(Number(payload.orderId)) &&
      Number(payload.orderId) > 0
    ) {
      deliveryConfirmationCode = generateDeliveryConfirmationCode({
        orderId: Number(payload.orderId),
        publicId: String(payload.publicId),
        deliveryStartedAt: payload.deliveryStartedAt,
      });
    }

    const message = buildAutomaticOrderStatusMessage({
      customerName: payload.customerName,
      restaurantName: payload.restaurantName,
      orderId: payload.orderId,
      status: payload.status,
      orderType: payload.orderType,
      deliveryConfirmationCode,
      ...links,
    });
    const name = String(payload.customerName || 'Cliente').trim() || 'Cliente';
    const restaurant = String(payload.restaurantName || 'restaurante').trim() || 'restaurante';
    const status = String(payload.status || '').toUpperCase();
    const link =
      status === 'ENTREGUE' ? links.confirmationUrl || '' : links.trackingUrl || links.storeUrl || '';
    return await queueWhatsappMessage({
      restaurantWhatsapp: payload.restaurantWhatsapp,
      destination: payload.customerPhone,
      message,
      metadata: {
        orderId: payload.orderId,
        status: payload.status,
        restaurantId: payload.restaurantId,
        event: 'ORDER_STATUS_CHANGED',
        ...(deliveryConfirmationCode ? { deliveryConfirmationCode } : {}),
        templateParams: [name, String(payload.orderId || ''), restaurant, link],
      },
    });
  } catch (error) {
    console.error('[CUSTOMER_STATUS_NOTIFICATION_ERROR]', getErrorMessage(error));
    return { sent: false, reason: 'send_failed', provider };
  }
}

export async function notifyRestaurantPaymentPinRequested(payload: RestaurantPinRequestedPayload) {
  const provider = resolveProvider();
  if (provider === 'none') return { sent: false, reason: 'provider_not_configured' };
  if (!providerSupported(provider)) {
    return { sent: false, reason: 'provider_not_supported', provider };
  }
  try {
    return await queueWhatsappMessage({
      restaurantWhatsapp: payload.restaurantWhatsapp,
      destination: payload.restaurantWhatsapp,
      message: buildRestaurantPinRequestMessage(payload),
      metadata: {
        orderId: payload.orderId,
        requestedByRole: payload.requestedByRole,
        event: 'PAYMENT_PIN_REQUESTED',
      },
    });
  } catch (error) {
    console.error('[RESTAURANT_PIN_NOTIFICATION_ERROR]', getErrorMessage(error));
    return { sent: false, reason: 'send_failed', provider, error: getErrorMessage(error) };
  }
}

export async function notifyRestaurantOrderIssueReported(
  payload: RestaurantOrderIssueReportedPayload,
) {
  const provider = resolveProvider();
  if (provider === 'none') return { sent: false, reason: 'provider_not_configured' };
  if (!providerSupported(provider)) {
    return { sent: false, reason: 'provider_not_supported', provider };
  }
  try {
    return await queueWhatsappMessage({
      restaurantWhatsapp: payload.restaurantWhatsapp,
      destination: payload.restaurantWhatsapp,
      message: buildRestaurantIssueMessage(payload),
      metadata: {
        orderId: payload.orderId,
        customerName: payload.customerName,
        issueMessage: payload.issueMessage,
        orderStatus: payload.orderStatus,
        orderType: payload.orderType,
        paymentMethod: payload.paymentMethod,
        total: payload.total,
        addressLabel: payload.addressLabel,
        itemsSummary: payload.itemsSummary,
        createdAt: payload.createdAt,
        event: 'ORDER_ISSUE_REPORTED',
      },
    });
  } catch (error) {
    console.error('[RESTAURANT_ORDER_ISSUE_NOTIFICATION_ERROR]', getErrorMessage(error));
    return { sent: false, reason: 'send_failed', provider, error: getErrorMessage(error) };
  }
}
