import api from "./api";

type OrderPayload = Record<string, unknown>;
type PixPaymentPayload = Record<string, unknown>;
type PixPaymentStatusPayload = Record<string, unknown>;

class OrdersService {
  async listRestaurantOrders(status?: string) {
    const response = await api.get("/orders", {
      params: status ? { status } : undefined,
    });

    return response.data;
  }

  async listMyOrders() {
    const response = await api.get("/orders/my-orders");
    return response.data;
  }

  async createOrder(payload: OrderPayload) {
    const response = await api.post("/orders", payload);
    return response.data;
  }

  async createPixPayment(payload: PixPaymentPayload) {
    const response = await api.post("/orders/pix/payment", payload);
    return response.data;
  }

  async getPixPaymentStatus(payload: PixPaymentStatusPayload) {
    const response = await api.post("/orders/pix/payment/status", payload);
    return response.data;
  }

  async updateStatus(orderId: string | number, status: string) {
    const response = await api.put(`/orders/${orderId}/status`, { status });
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
}

export default new OrdersService();
