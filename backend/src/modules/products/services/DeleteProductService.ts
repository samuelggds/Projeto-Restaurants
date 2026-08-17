import productRepository from '../repositories/ProductRepository.js';

class DeleteProductService {
  async execute(id: number | string, restaurantId: number) {
    const product = await productRepository.findById(id, restaurantId);

    if (!product) {
      throw new Error('Produto não encontrado!');
    }

    await productRepository.delete(id, restaurantId);
  }
}

export default new DeleteProductService();
