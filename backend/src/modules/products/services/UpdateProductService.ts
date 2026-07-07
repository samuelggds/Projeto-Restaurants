import { createProductSchema } from "../../../validators/ProductValidator.js";
import productRepository from "../repositories/ProductRepository.js";
import { z } from "zod";

type UpdateProductInput = Partial<z.infer<typeof createProductSchema>>;

class UpdateProductService {
  async execute(
    id: number | string,
    data: UpdateProductInput,
    restaurantId: number,
  ) {
    createProductSchema.partial().parse(data);

    const product = await productRepository.findById(id, restaurantId);

    if (!product) {
      throw new Error("Produto não encontrado!");
    }
    return productRepository.update(id, data, restaurantId);
  }
}

export default new UpdateProductService();
