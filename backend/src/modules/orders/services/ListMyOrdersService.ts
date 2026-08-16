import orderRepository from '../repositories/OrderRepository.js';

class ListMyOrdersService {
  async execute(userId: number | string, restaurantId: number | string) {
    return orderRepository.findByUserId(userId, restaurantId);
  }
}

export default new ListMyOrdersService();
