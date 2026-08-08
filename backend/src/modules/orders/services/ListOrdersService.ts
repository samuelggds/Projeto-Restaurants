import { OrderStatus, UserRole } from "@prisma/client";
import orderRepository from "../repositories/OrderRepository.js";

class ListOrdersService {
  async execute(
    restaurantId: number,
    status?: OrderStatus,
    role?: UserRole | string,
    userId?: number | null,
  ) {
    if (String(role || "").toUpperCase() === UserRole.MOTOQUEIRO) {
      const courierId = Number(userId || 0);
      if (!Number.isInteger(courierId) || courierId <= 0) {
        throw new Error("Motoqueiro inválido.");
      }
      return orderRepository.findCourierOrders(restaurantId, courierId, status);
    }

    return orderRepository.findAll(restaurantId, status);
  }
}

export default new ListOrdersService();
