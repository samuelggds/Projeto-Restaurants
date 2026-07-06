import api from "./api";

class CategoriesService {
  async listCategories() {
    const response = await api.get("/categories");
    return response.data;
  }

  async createCategory(payload) {
    const response = await api.post("/categories", payload);
    return response.data;
  }
}

export default new CategoriesService();
