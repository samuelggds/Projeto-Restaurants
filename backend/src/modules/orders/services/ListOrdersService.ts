import { FuncionarioSubRole, OrderStatus, UserRole } from '@prisma/client';
import orderRepository from '../repositories/OrderRepository.js';
import courierAccessService from './CourierAccessService.js';

class ListOrdersService {
  async execute(
    restaurantId: number,
    status?: OrderStatus,
    role?: UserRole | string,
    userId?: number | null,
    subRole?: FuncionarioSubRole | string | null,
  ) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para listar pedidos.');
    }

    if (String(role || '').toUpperCase() === UserRole.MOTOQUEIRO) {
      const courierId = Number(userId || 0);
      if (!Number.isInteger(courierId) || courierId <= 0) {
        throw new Error('Motoqueiro inválido.');
      }
      await courierAccessService.assertActiveCourier(courierId, normalizedRestaurantId);
      return orderRepository.findCourierOrders(normalizedRestaurantId, courierId, status);
    }

    if (String(role || '').toUpperCase() === UserRole.FUNCIONARIO) {
      const normalizedSubRole = String(subRole || '').toUpperCase();

      if (normalizedSubRole === FuncionarioSubRole.GARCOM) {
        if (status && status !== OrderStatus.PRONTO) {
          return [];
        }
        return orderRepository.findReadyTableOrders(normalizedRestaurantId);
      }

      if (normalizedSubRole !== FuncionarioSubRole.COZINHA) {
        throw new Error('Funcionário sem perfil operacional válido.');
      }
    }

    return orderRepository.findAll(normalizedRestaurantId, status);
  }
}

export default new ListOrdersService();
