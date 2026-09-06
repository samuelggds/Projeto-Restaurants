import api from './api';

type OrderPayload = Record<string, unknown>;
type PixPaymentPayload = Record<string, unknown>;
type PixPaymentStatusPayload = Record<string, unknown>;
type GenericRecord = Record<string, unknown>;
export type GuestOrderProof = { orderId: number; token: string };

const MAX_DELIVERY_TRACKING_ACCURACY_METERS = 500;
const GUEST_TRACKING_TOKEN_PREFIX = 'guest-order-tracking-token:';
const GUEST_OWNERSHIP_TOKEN_PREFIX = 'guest-order-ownership-token:';
const GUEST_OWNED_ORDER_IDS_KEY = 'guest-order-owned-order-ids';
const LAST_GUEST_DELIVERY_ORDER_KEY = 'last-guest-delivery-order-id';

function asRecord(value: unknown): GenericRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as GenericRecord;
}

function safeStorageGet(key: string) {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // O checkout não deve falhar caso o navegador bloqueie o armazenamento local.
  }
}

function safeStorageRemove(key: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // A remoção é best-effort em ambientes com storage restrito.
  }
}

function readOwnedOrderIds() {
  try {
    const parsed = JSON.parse(safeStorageGet(GUEST_OWNED_ORDER_IDS_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 0)
      .slice(-50);
  } catch {
    return [];
  }
}

function rememberGuestOrderAccess(payload: unknown) {
  const record = asRecord(payload);
  if (!record || typeof window === 'undefined') return;
  const orderId = Number(record.id ?? record.orderId ?? 0);
  if (!Number.isInteger(orderId) || orderId <= 0) return;

  const trackingToken = String(record.guestTrackingToken || '').trim();
  if (trackingToken) {
    safeStorageSet(`${GUEST_TRACKING_TOKEN_PREFIX}${orderId}`, trackingToken);
    safeStorageSet(LAST_GUEST_DELIVERY_ORDER_KEY, String(orderId));
  }

  const ownershipToken = String(record.guestOwnershipToken || '').trim();
  if (ownershipToken) {
    safeStorageSet(`${GUEST_OWNERSHIP_TOKEN_PREFIX}${orderId}`, ownershipToken);
    const ids = [...new Set([...readOwnedOrderIds(), orderId])].slice(-50);
    safeStorageSet(GUEST_OWNED_ORDER_IDS_KEY, JSON.stringify(ids));
  }
}

function readTrackingTokenFromCurrentUrl(orderId: number) {
  if (typeof window === 'undefined' || !Number.isInteger(orderId) || orderId <= 0) return '';
  const routeOrderId = Number(window.location.pathname.match(/^\/orders\/(\d+)\/tracking\/?$/u)?.[1] || 0);
  if (routeOrderId !== orderId) return '';
  const hash = String(window.location.hash || '').replace(/^#/u, '');
  const token = String(new URLSearchParams(hash).get('guestToken') || '').trim();
  if (!token) return '';
  safeStorageSet(`${GUEST_TRACKING_TOKEN_PREFIX}${orderId}`, token);
  safeStorageSet(LAST_GUEST_DELIVERY_ORDER_KEY, String(orderId));
  return token;
}

export function getGuestOrderTrackingToken(orderId: string | number) {
  const normalizedOrderId = Number(orderId);
  const stored = safeStorageGet(`${GUEST_TRACKING_TOKEN_PREFIX}${normalizedOrderId}`) || '';
  return stored || readTrackingTokenFromCurrentUrl(normalizedOrderId);
}

export function getGuestOrderOwnershipToken(orderId: string | number) {
  return safeStorageGet(`${GUEST_OWNERSHIP_TOKEN_PREFIX}${Number(orderId)}`) || '';
}

export function getGuestOwnedOrderProofs(): GuestOrderProof[] {
  return readOwnedOrderIds().flatMap((orderId) => {
    const token = getGuestOrderOwnershipToken(orderId);
    return token ? [{ orderId, token }] : [];
  });
}

export function getLatestGuestDeliveryOrderId() {
  const orderId = Number(safeStorageGet(LAST_GUEST_DELIVERY_ORDER_KEY) || 0);
  return Number.isInteger(orderId) && orderId > 0 ? orderId : null;
}

export function clearGuestOrderTrackingAccess(orderId: string | number) {
  const normalizedOrderId = Number(orderId);
  safeStorageRemove(`${GUEST_TRACKING_TOKEN_PREFIX}${normalizedOrderId}`);
  if (Number(safeStorageGet(LAST_GUEST_DELIVERY_ORDER_KEY) || 0) === normalizedOrderId) {
    safeStorageRemove(LAST_GUEST_DELIVERY_ORDER_KEY);
  }
}

export function clearGuestOrderOwnershipAccess(orderId: string | number) {
  const normalizedOrderId = Number(orderId);
  safeStorageRemove(`${GUEST_OWNERSHIP_TOKEN_PREFIX}${normalizedOrderId}`);
  clearGuestOrderTrackingAccess(normalizedOrderId);
  const ids = readOwnedOrderIds().filter((candidate) => candidate !== normalizedOrderId);
  if (ids.length) safeStorageSet(GUEST_OWNED_ORDER_IDS_KEY, JSON.stringify(ids));
  else safeStorageRemove(GUEST_OWNED_ORDER_IDS_KEY);
}

function normalizeOrderItem(item: unknown) {
  const record = asRecord(item);
  if (!record) return item;
  const productRecord = asRecord(record.product) || {};
  const fallbackName = String(record.productName || record.name || record.title || '').trim() || undefined;
  return {
    ...record,
    quantity: Number(record.quantity || 0) || 0,
    product: { ...productRecord, name: productRecord.name || fallbackName },
  };
}

function normalizeOrder(order: unknown) {
  const record = asRecord(order);
  if (!record) return order;
  const rawItems = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.orderItems)
      ? record.orderItems
      : [];
  return { ...record, items: rawItems.map(normalizeOrderItem) };
}

function normalizeOrdersPayload(payload: unknown) {
  const payloadRecord = asRecord(payload);
  const candidate = Array.isArray(payload)
    ? payload
    : Array.isArray(payloadRecord?.orders)
      ? payloadRecord.orders
      : [];
  return candidate.map(normalizeOrder);
}

class OrdersService {
  async listRestaurantOrders(status?: string) {
    const response = await api.get('/orders', { params: status ? { status } : undefined });
    return normalizeOrdersPayload(response.data);
  }

  async listMyOrders() {
    const response = await api.get('/orders/my-orders');
    return response.data;
  }

  async clearOrdersAndCategories(confirmation: string) {
    const response = await api.delete('/orders/cleanup/orders-categories', { data: { confirmation } });
    return response.data;
  }

  async getCurrentTableOrder() {
    const response = await api.get('/orders/table/current');
    const order = response.data?.order || null;
    return order ? normalizeOrder(order) : null;
  }

  async createOrder(payload: OrderPayload) {
    const response = await api.post('/orders', payload);
    rememberGuestOrderAccess(response.data);
    return response.data;
  }

  async quoteOrder(payload: OrderPayload) {
    const response = await api.post('/orders/quote', payload);
    return response.data;
  }

  async createPixPayment(payload: PixPaymentPayload) {
    const response = await api.post('/orders/pix/payment', payload);
    rememberGuestOrderAccess(response.data);
    return response.data;
  }

  async createCardCheckout(payload: PixPaymentPayload) {
    const response = await api.post('/orders/card/checkout', payload);
    rememberGuestOrderAccess(response.data);
    return response.data;
  }

  async getCardPaymentStatus(payload: PixPaymentStatusPayload) {
    const response = await api.post('/orders/card/checkout/status', payload);
    return response.data;
  }

  async getPixPaymentStatus(payload: PixPaymentStatusPayload) {
    const response = await api.post('/orders/pix/payment/status', payload);
    return response.data;
  }

  async confirmPixPayment(payload: PixPaymentStatusPayload) {
    const response = await api.post('/orders/pix/payment/confirm', payload);
    return response.data;
  }

  async claimGuestOrders(proofs: GuestOrderProof[], accessToken?: string) {
    const response = await api.post(
      '/orders/claim-guest-orders',
      { proofs },
      accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    );
    const claimedIds = Array.isArray(response.data?.orderIds) ? response.data.orderIds.map(Number) : [];
    claimedIds.forEach(clearGuestOrderOwnershipAccess);
    return response.data as {
      claimedCount: number;
      orderIds: number[];
      restaurantId: number | null;
      ignoredCount?: number;
    };
  }

  async updateStatus(orderId: string | number, status: string, deliveryConfirmationCode?: string) {
    const response = await api.put(`/orders/${orderId}/status`, {
      status,
      ...(deliveryConfirmationCode ? { deliveryConfirmationCode } : {}),
    });
    return response.data;
  }

  async claimDelivery(
    orderId: string | number,
    initialLocation?: {
      latitude: number;
      longitude: number;
      heading?: number | null;
      speed?: number | null;
      accuracy?: number | null;
      sentAt: string;
    },
  ) {
    const accuracy = Number(initialLocation?.accuracy);
    const hasShareableInitialLocation =
      Boolean(initialLocation) &&
      Number.isFinite(accuracy) &&
      accuracy >= 0 &&
      accuracy <= MAX_DELIVERY_TRACKING_ACCURACY_METERS;
    const response = await api.patch(`/orders/${orderId}/claim-delivery`, {
      ...(hasShareableInitialLocation ? { initialLocation } : {}),
    });
    return normalizeOrder(response.data);
  }

  async getDeliveryPayment(orderId: string | number) {
    const response = await api.get(`/orders/${orderId}/delivery-payment`);
    return response.data?.payment || null;
  }

  async reconcileDeliveryPix(orderId: string | number) {
    const response = await api.post(`/orders/${orderId}/delivery-payment/reconcile-pix`);
    return response.data?.payment || null;
  }

  async reconcileDeliveryCard(orderId: string | number) {
    const response = await api.post(`/orders/${orderId}/delivery-payment/reconcile-card`);
    return response.data?.payment || null;
  }

  async confirmDeliveryReceived(orderId: string | number) {
    const guestToken = getGuestOrderTrackingToken(orderId);
    const response = await api.patch(
      `/orders/${orderId}/confirm-delivery-received`,
      undefined,
      guestToken ? { headers: { 'x-guest-order-token': guestToken } } : undefined,
    );
    return normalizeOrder(response.data);
  }

  async getCourierFinance() {
    const response = await api.get('/orders/courier/finance');
    return response.data;
  }

  async getDeliveryTracking(orderId: string | number) {
    const guestToken = getGuestOrderTrackingToken(orderId);
    const response = await api.get(`/orders/${orderId}/tracking`, {
      ...(guestToken ? { headers: { 'x-guest-order-token': guestToken } } : {}),
    });
    return response.data;
  }

  async cancelOrder(orderId: string | number) {
    const response = await api.patch(`/orders/${orderId}/cancel`);
    return response.data;
  }

  async confirmPayment(orderId: string | number) {
    const response = await api.patch(`/orders/${orderId}/confirm-payment`);
    return response.data;
  }

  async generatePaymentConfirmationPin(orderId: string | number) {
    const response = await api.post(`/orders/${orderId}/payment-confirmation-pin`);
    return response.data;
  }

  async requestPaymentConfirmationPin(orderId: string | number) {
    const response = await api.post(`/orders/${orderId}/request-payment-confirmation-pin`);
    return response.data;
  }

  async confirmPaymentWithPin(orderId: string | number, pin: string) {
    const response = await api.patch(`/orders/${orderId}/confirm-payment-with-pin`, { pin });
    return response.data;
  }

  async reportIssue(orderId: string | number, message: string) {
    const guestToken = getGuestOrderOwnershipToken(orderId);
    const response = await api.post(
      `/orders/${orderId}/report-issue`,
      { message },
      guestToken ? { headers: { 'x-guest-order-ownership': guestToken } } : undefined,
    );
    return response.data;
  }

  async replyIssue(orderId: string | number, message: string) {
    const response = await api.post(`/orders/${orderId}/reply-issue`, { message });
    return response.data;
  }

  async getIssueThread(orderId: string | number) {
    const guestToken = getGuestOrderOwnershipToken(orderId);
    const response = await api.get(`/orders/${orderId}/issue-thread`, {
      ...(guestToken ? { headers: { 'x-guest-order-ownership': guestToken } } : {}),
    });
    return response.data;
  }

  async resolveIssue(orderId: string | number) {
    const response = await api.patch(`/orders/${orderId}/resolve-issue`);
    return response.data;
  }

  async refundOrder(orderId: string | number) {
    const response = await api.patch(`/orders/${orderId}/refund`);
    return response.data;
  }

  async reprintKitchenOrder(orderId: string | number) {
    const response = await api.post(`/kitchen-printing/orders/${orderId}/reprint`);
    return response.data;
  }
}

export default new OrdersService();
