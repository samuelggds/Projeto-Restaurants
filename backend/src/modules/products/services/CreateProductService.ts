import productRepository from "../repositories/ProductRepository.js";
import { createProductSchema } from "../../../validators/ProductValidator.js";

class CreateProductService {
  async execute(data, restaurantId) {
    if (!restaurantId) {
      throw new Error("Restaurante não encontrado");
    }

    createProductSchema.parse(data);

    const product = await productRepository.create(data, restaurantId);

    return {
      product,
    };
  }
}

export default new CreateProductService();
