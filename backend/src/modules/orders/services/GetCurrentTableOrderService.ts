import orderRepository from '../repositories/OrderRepository.js';

class GetCurrentTableOrderService {
  async execute(tableId: number | string, restaurantId: number | string) {
    if (!Number(tableId) || !Number(restaurantId)) {
      return null;
    }

    return orderRepository.findLatestByTable(tableId, restaurantId);
  }
}

export default new GetCurrentTableOrderService();
