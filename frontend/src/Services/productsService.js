import api from "./api";

class ProductsService {
  async createProduct(payload) {
    const response = await api.post("/products", payload);
    return response.data;
  }
}

export default new ProductsService();
