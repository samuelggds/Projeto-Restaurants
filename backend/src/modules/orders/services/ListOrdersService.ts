import orderRepository from "../repositories/OrderRepository.js";

class ListOrdersService {
  async execute(restaurantId, status) {
    return orderRepository.findAll(restaurantId, status);
  }
}

export default new ListOrdersService();
