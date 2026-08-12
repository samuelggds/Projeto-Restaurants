import api from "./api";

export type CreateRestaurantPayload = {
  plan: "BASICO" | "PREMIUM";
  restaurant: {
    name: string;
    slug: string;
    email: string;
    phone?: string;
  };
  admin: {
    name: string;
    email: string;
    password: string;
  };
};

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

  async createRestaurant(payload: CreateRestaurantPayload) {
    const response = await api.post("/restaurants", payload);
    return response.data;
  }
}

export default new RestaurantsService();
