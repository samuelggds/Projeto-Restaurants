import api from "./api";

class FavoritesService {
  async list(restaurantId?: string | number | null) {
    const response = await api.get("/favorites", {
      params: restaurantId ? { restaurantId } : undefined,
    });
    return Array.isArray(response.data?.favorites) ? response.data.favorites : [];
  }
  async add(productId: string | number) {
    const response = await api.post(`/favorites/${productId}`);
    return response.data;
  }
  async remove(productId: string | number) {
    const response = await api.delete(`/favorites/${productId}`);
    return response.data;
  }
}

export default new FavoritesService();
