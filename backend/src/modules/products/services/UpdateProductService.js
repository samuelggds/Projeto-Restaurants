import { createProductSchema } from "../../../validators/ProductValidator.js";
import productRepository from "../repositories/ProductRepository.js";

class UpdateProductService {
  async execute(id, data, restaurantId) {
    createProductSchema.partial().parse(data);

    const product = await productRepository.findById(id, restaurantId);

    if (!product) {
      throw new Error("Produto não encontrado!");
    }
    return productRepository.update(id, data, restaurantId);
  }
}

export default new UpdateProductService();
