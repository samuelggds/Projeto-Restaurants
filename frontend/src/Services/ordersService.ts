import api from "./api";

type OrderPayload = Record<string, unknown>;
type PixPaymentPayload = Record<string, unknown>;
type PixPaymentStatusPayload = Record<string, unknown>;
type GenericRecord = Record<string, unknown>;

function asRecord(value: unknown): GenericRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as GenericRecord;
}

function normalizeOrderItem(item: unknown) {
  const record = asRecord(item);
  if (!record) {
    return item;
  }

  const productRecord = asRecord(record.product) || {};
  const fallbackName =
    String(record.productName || record.name || record.title || "").trim() ||
    undefined;

  return {
    ...record,
    quantity: Number(record.quantity || 0) || 0,
    product: {
      ...productRecord,
      name: productRecord.name || fallbackName,
    },
  };
}

function normalizeOrder(order: unknown) {
  const record = asRecord(order);
  if (!record) {
    return order;
  }

  const rawItems = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.orderItems)
      ? record.orderItems
      : [];

  return {
    ...record,
    items: rawItems.map(normalizeOrderItem),
  };
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
    const response = await api.get("/orders", {
      params: status ? { status } : undefined,
    });

    return normalizeOrdersPayload(response.data);
  }

  async listMyOrders() {
    const response = await api.get("/orders/my-orders");
    return response.data;
  }

  async getCurrentTableOrder() {
    const response = await api.get("/orders/table/current");
    const order = response.data?.order || null;
    return order ? normalizeOrder(order) : null;
  }

  async createOrder(payload: OrderPayload) {
    const response = await api.post("/orders", payload);
    return response.data;
  }

  async createPixPayment(payload: PixPaymentPayload) {
    const response = await api.post("/orders/pix/payment", payload);
    return response.data;
  }

  async createCardCheckout(payload: PixPaymentPayload) {
    const response = await api.post("/orders/card/checkout", payload);
    return response.data;
  }

  async getPixPaymentStatus(payload: PixPaymentStatusPayload) {
    const response = await api.post("/orders/pix/payment/status", payload);
    return response.data;
  }

  async confirmPixPayment(payload: PixPaymentStatusPayload) {
    const response = await api.post("/orders/pix/payment/confirm", payload);
    return response.data;
  }

  async updateStatus(
    orderId: string | number,
    status: string,
    deliveryConfirmationCode?: string,
  ) {
    const response = await api.put(`/orders/${orderId}/status`, {
      status,
      ...(deliveryConfirmationCode
        ? {
            deliveryConfirmationCode,
          }
        : {}),
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
    const response = await api.post(
      `/orders/${orderId}/payment-confirmation-pin`,
    );
    return response.data;
  }

  async requestPaymentConfirmationPin(orderId: string | number) {
    const response = await api.post(
      `/orders/${orderId}/request-payment-confirmation-pin`,
    );
    return response.data;
  }

  async confirmPaymentWithPin(orderId: string | number, pin: string) {
    const response = await api.patch(
      `/orders/${orderId}/confirm-payment-with-pin`,
      {
        pin,
      },
    );
    return response.data;
  }

  async reportIssue(orderId: string | number, message: string) {
    const response = await api.post(`/orders/${orderId}/report-issue`, {
      message,
    });
    return response.data;
  }

  async replyIssue(orderId: string | number, message: string) {
    const response = await api.post(`/orders/${orderId}/reply-issue`, {
      message,
    });
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
}

export default new OrdersService();
