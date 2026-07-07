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

  async createRestaurant(payload) {
    const response = await api.post("/restaurants", payload);
    return response.data;
  }
}

export default new RestaurantsService();
