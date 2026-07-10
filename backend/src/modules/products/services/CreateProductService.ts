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

    const normalizedStock =
      data.stock === null || data.stock === undefined
        ? null
        : Number(data.stock);
    const shouldForceUnavailable =
      Number.isInteger(normalizedStock) && normalizedStock === 0;

    const payload: CreateProductInput = {
      ...data,
      active: shouldForceUnavailable ? false : data.active,
    };

    const product = await productRepository.create(payload, restaurantId);

    return {
      product,
    };
  }
}

export default new CreateProductService();
