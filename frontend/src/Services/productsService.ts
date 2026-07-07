import api from "./api";

function resolveRestaurantIdFromStorage() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const tableSession = JSON.parse(
      localStorage.getItem("tableSession") || "null",
    );
    const fromUser = Number(
      user?.restaurantId ||
        user?.restaurant?.id ||
        user?.restaurant?.restaurantId ||
        0,
    );
    const fromSession = Number(tableSession?.restaurantId || 0);
    const fromMenu = Number(localStorage.getItem("menuRestaurantId") || 0);

    if (fromUser > 0) {
      return fromUser;
    }

    if (fromSession > 0) {
      return fromSession;
    }

    return fromMenu > 0 ? fromMenu : null;
  } catch {
    return null;
  }
}

class ProductsService {
  async listProducts(restaurantId?: string | number | null) {
    const resolvedRestaurantId =
      Number(restaurantId || 0) > 0
        ? Number(restaurantId)
        : resolveRestaurantIdFromStorage();

    const response = await api.get("/products", {
      params: resolvedRestaurantId
        ? { restaurantId: resolvedRestaurantId }
        : undefined,
    });
    const payload = response.data;

    if (Array.isArray(payload)) {
      return payload;
    }

    return Array.isArray(payload?.products) ? payload.products : [];
  }

  async createProduct(payload: any) {
    const response = await api.post("/products", payload);
    return response.data;
  }

  async updateProduct(id: string | number, payload: any) {
    const response = await api.put(`/products/${id}`, payload);
    return response.data;
  }

  async deleteProduct(id: string | number) {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  }
}

export default new ProductsService();
