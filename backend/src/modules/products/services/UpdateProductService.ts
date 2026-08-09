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

    const stockWasProvided = Object.prototype.hasOwnProperty.call(data, "stock");
    const normalizedStock =
      data.stock === null || data.stock === undefined
        ? null
        : Number(data.stock);

    let nextActive = data.active;

    if (stockWasProvided) {
      nextActive = normalizedStock === null || normalizedStock > 0;
    }

    const payload: UpdateProductInput = {
      ...data,
      active: nextActive,
    };

    return productRepository.update(id, payload, restaurantId);
  }
}

export default new UpdateProductService();
