import productRepository from "../repositories/ProductRepository.js";
import { createProductSchema } from "../../../validators/ProductValidator.js";
function requireDefined(value, message) {
    if (value === null || value === undefined) {
        throw new Error(message);
    }
    return value;
}
class CreateProductService {
    async execute(data, restaurantId) {
        if (!restaurantId) {
            throw new Error("Restaurante não encontrado");
        }
        const parsedData = createProductSchema.parse(data);
        const normalizedStock = parsedData.stock === null || parsedData.stock === undefined
            ? null
            : Number(parsedData.stock);
        const shouldForceUnavailable = Number.isInteger(normalizedStock) && normalizedStock === 0;
        const requiredName = requireDefined(parsedData.name, "Nome do produto é obrigatório.");
        const requiredPrice = requireDefined(parsedData.price, "Preço do produto é obrigatório.");
        const requiredCategoryId = requireDefined(parsedData.categoryId, "Categoria do produto é obrigatória.");
        const payload = {
            ...parsedData,
            name: requiredName,
            price: requiredPrice,
            categoryId: requiredCategoryId,
            active: shouldForceUnavailable ? false : parsedData.active,
        };
        const product = await productRepository.create(payload, restaurantId);
        return {
            product,
        };
    }
}
export default new CreateProductService();
