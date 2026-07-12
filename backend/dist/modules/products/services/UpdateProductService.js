import { createProductSchema } from "../../../validators/ProductValidator.js";
import productRepository from "../repositories/ProductRepository.js";
class UpdateProductService {
    async execute(id, data, restaurantId) {
        createProductSchema.partial().parse(data);
        const product = await productRepository.findById(id, restaurantId);
        if (!product) {
            throw new Error("Produto não encontrado!");
        }
        const normalizedStock = data.stock === null || data.stock === undefined
            ? null
            : Number(data.stock);
        let nextActive = data.active;
        if (Number.isInteger(normalizedStock) && normalizedStock >= 0) {
            nextActive = normalizedStock > 0;
        }
        const payload = {
            ...data,
            active: nextActive,
        };
        return productRepository.update(id, payload, restaurantId);
    }
}
export default new UpdateProductService();
