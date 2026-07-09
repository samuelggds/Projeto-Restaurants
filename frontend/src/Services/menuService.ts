import api from "./api";

class MenuService {
  async listProducts(restaurantId) {
    const response = await api.get("/products", {
      params: { restaurantId },
    });

    return response.data?.products || [];
  }

  async listProductsBySlug(slug) {
    const response = await api.get("/products", {
      params: { slug },
    });

    return response.data?.products || [];
  }

  async listProductRatings(restaurantId, clientKey) {
    const response = await api.get("/products/ratings", {
      params: {
        restaurantId,
        clientKey,
      },
    });

    return response.data?.ratings || [];
  }

  async rateProduct({ restaurantId, productId, rating, clientKey }) {
    const response = await api.post(`/products/${productId}/rating`, {
      restaurantId,
      rating,
      clientKey,
    });

    return response.data?.rating || null;
  }
}

export default new MenuService();
