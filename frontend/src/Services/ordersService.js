import api from "./api";

class OrdersService {
  async listRestaurantOrders(status) {
    const response = await api.get("/orders", {
      params: status ? { status } : undefined,
    });

    return response.data;
  }

  async listMyOrders() {
    const response = await api.get("/orders/my-orders");
    return response.data;
  }

  async createOrder(payload) {
    const response = await api.post("/orders", payload);
    return response.data;
  }

  async createPixPayment(payload) {
    const response = await api.post("/orders/pix/payment", payload);
    return response.data;
  }

  async getPixPaymentStatus(payload) {
    const response = await api.post("/orders/pix/payment/status", payload);
    return response.data;
  }

  async updateStatus(orderId, status) {
    const response = await api.put(`/orders/${orderId}/status`, { status });
    return response.data;
  }

  async cancelOrder(orderId) {
    const response = await api.patch(`/orders/${orderId}/cancel`);
    return response.data;
  }

  async confirmPayment(orderId) {
    const response = await api.patch(`/orders/${orderId}/confirm-payment`);
    return response.data;
  }

  async generatePaymentConfirmationPin(orderId) {
    const response = await api.post(
      `/orders/${orderId}/payment-confirmation-pin`,
    );
    return response.data;
  }

  async requestPaymentConfirmationPin(orderId) {
    const response = await api.post(
      `/orders/${orderId}/request-payment-confirmation-pin`,
    );
    return response.data;
  }

  async confirmPaymentWithPin(orderId, pin) {
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
