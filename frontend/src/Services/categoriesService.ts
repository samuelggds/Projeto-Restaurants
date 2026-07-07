import api from "./api";

class CategoriesService {
  async listCategories() {
    const response = await api.get("/categories");
    const payload = response.data;

    if (Array.isArray(payload)) {
      return payload;
    }

    return Array.isArray(payload?.categories) ? payload.categories : [];
  }

  async createCategory(payload) {
    const response = await api.post("/categories", payload);
    return response.data;
  }

  async updateCategory(id, payload) {
    const response = await api.put(`/categories/${id}`, payload);
    return response.data;
  }

  async deleteCategory(id) {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  }
}

export default new CategoriesService();
