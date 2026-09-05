import api from './api';

type OrderPayload = Record<string, unknown>;
type PixPaymentPayload = Record<string, unknown>;
type PixPaymentStatusPayload = Record<string, unknown>;
type GenericRecord = Record<string, unknown>;

const MAX_DELIVERY_TRACKING_ACCURACY_METERS = 500;
const GUEST_TRACKING_TOKEN_PREFIX = 'guest-order-tracking-token:';
const LAST_GUEST_DELIVERY_ORDER_KEY = 'last-guest-delivery-order-id';

function asRecord(value: unknown): GenericRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as GenericRecord;
}

function rememberGuestTrackingAccess(payload: unknown) {
  const record = asRecord(payload);
  if (!record || typeof window === 'undefined') return;
  const orderId = Number(record.id ?? record.orderId ?? 0);
  const token = String(record.guestTrackingToken || '').trim();
  if (!Number.isInteger(orderId) || orderId <= 0 || !token) return;
  localStorage.setItem(`${GUEST_TRACKING_TOKEN_PREFIX}${orderId}`, token);
  localStorage.setItem(LAST_GUEST_DELIVERY_ORDER_KEY, String(orderId));
}

export function getGuestOrderTrackingToken(orderId: string | number) {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(`${GUEST_TRACKING_TOKEN_PREFIX}${Number(orderId)}`) || '';
}

export function getLatestGuestDeliveryOrderId() {
  if (typeof window === 'undefined') return null;
  const orderId = Number(localStorage.getItem(LAST_GUEST_DELIVERY_ORDER_KEY) || 0);
  return Number.isInteger(orderId) && orderId > 0 ? orderId : null;
}

export function clearGuestOrderTrackingAccess(orderId: string | number) {
  if (typeof window === 'undefined') return;
  const normalizedOrderId = Number(orderId);
  localStorage.removeItem(`${GUEST_TRACKING_TOKEN_PREFIX}${normalizedOrderId}`);
  if (Number(localStorage.getItem(LAST_GUEST_DELIVERY_ORDER_KEY) || 0) === normalizedOrderId) {
    localStorage.removeItem(LAST_GUEST_DELIVERY_ORDER_KEY);
  }
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
    rememberGuestTrackingAccess(response.data);
    return response.data;
  }

  async quoteOrder(payload: OrderPayload) {
    const response = await api.post('/orders/quote', payload);
    return response.data;
  }

  async createPixPayment(payload: PixPaymentPayload) {
    const response = await api.post('/orders/pix/payment', payload);
    rememberGuestTrackingAccess(response.data);
    return response.data;
  }

  async createCardCheckout(payload: PixPaymentPayload) {
    const response = await api.post('/orders/card/checkout', payload);
    rememberGuestTrackingAccess(response.data);
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
    const response = await api.patch(`/orders/${orderId}/confirm-delivery-received`);
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
    const response = await api.post(`/orders/${orderId}/report-issue`, { message });
    return response.data;
  }

  async replyIssue(orderId: string | number, message: string) {
    const response = await api.post(`/orders/${orderId}/reply-issue`, { message });
    return response.data;
  }

  async getIssueThread(orderId: string | number) {
    const response = await api.get(`/orders/${orderId}/issue-thread`);
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
