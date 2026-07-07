import { OrderStatus } from "@prisma/client";
import orderRepository from "../repositories/OrderRepository.js";

class ListOrdersService {
  async execute(restaurantId: number, status?: OrderStatus) {
    return orderRepository.findAll(restaurantId, status);
  }
}

export default new ListOrdersService();
