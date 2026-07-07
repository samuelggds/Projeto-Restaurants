import productRepository from "../repositories/ProductRepository.js";
import { createProductSchema } from "../../../validators/ProductValidator.js";
import { z } from "zod";

type CreateProductInput = z.infer<typeof createProductSchema>;

class CreateProductService {
  async execute(data: CreateProductInput, restaurantId: number) {
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
