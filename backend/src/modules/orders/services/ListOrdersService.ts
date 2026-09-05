import { FuncionarioSubRole, OrderStatus, UserRole } from '@prisma/client';
import orderRepository from '../repositories/OrderRepository.js';
import kitchenOrderRepository from '../repositories/KitchenOrderRepository.js';
import courierAccessService from './CourierAccessService.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { calculateCourierCompensation } from '../../courierCompensation/domain/courierCompensation.js';
import { findEffectiveCompensationPolicy } from '../../courierCompensation/repositories/CourierCompensationRepository.js';

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
      const orders = await orderRepository.findCourierOrders(
        normalizedRestaurantId,
        courierId,
        status,
      );
      const policy = await withTenantDbContext(normalizedRestaurantId, (db) =>
        findEffectiveCompensationPolicy(db, normalizedRestaurantId, courierId),
      );
      return orders.map((order) => {
        try {
          return {
            ...order,
            courierEarningPreview: {
              available: true,
              amount: Number(calculateCourierCompensation(policy, order.deliveryDistanceMeters)),
              model: policy.model,
              source: policy.source,
            },
          };
        } catch (error) {
          return {
            ...order,
            courierEarningPreview: {
              available: false,
              amount: null,
              model: policy.model,
              source: policy.source,
              reason: error instanceof Error ? error.message : 'Valor indisponível.',
            },
          };
        }
      });
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

      return kitchenOrderRepository.findAll(normalizedRestaurantId, status);
    }

    return orderRepository.findAll(normalizedRestaurantId, status);
  }
}

export default new ListOrdersService();
