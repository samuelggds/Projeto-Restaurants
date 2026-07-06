import api from "./api";

class MenuService {
  async listProducts(restaurantId) {
    const response = await api.get("/products", {
      params: { restaurantId },
    });

    return response.data?.products || [];
  }
}

export default new MenuService();
