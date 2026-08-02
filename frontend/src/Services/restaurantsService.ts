import api from "./api";

class RestaurantsService {
  async listRestaurants() {
    const response = await api.get("/restaurants");
    return response.data;
  }

  async getMetrics() {
    const response = await api.get("/restaurants/metrics");
    return response.data;
  }

  async getAllInvoices() {
    const response = await api.get("/billing/invoices/all");
    return response.data;
  }

  async getAllSupportTickets() {
    const response = await api.get("/ai-support/tickets/all");
    return response.data;
  }

  async getAuditLogs() {
    const response = await api.get("/audit-logs");
    return response.data;
  }

  async createRestaurant(payload) {
    const response = await api.post("/restaurants", payload);
    return response.data;
  }
}

export default new RestaurantsService();
