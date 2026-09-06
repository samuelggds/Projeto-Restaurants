import orderRepository from '../repositories/OrderRepository.js';
import { FuncionarioSubRole, UserRole } from '@prisma/client';
import courierAccessService from './CourierAccessService.js';

class GetOrderByIdService {
  async execute(
    orderId: number | string,
    restaurantId: number,
    role?: string,
    subRole?: string | null,
    actorUserId?: number | null,
  ) {
    const normalizedRole = String(role || '').toUpperCase();
    const normalizedSubRole = String(subRole || '').toUpperCase();

    if (normalizedRole === UserRole.MOTOQUEIRO) {
      const courierId = Number(actorUserId || 0);
      await courierAccessService.assertActiveCourier(courierId, Number(restaurantId));
      const courierOrder = await orderRepository.findCourierOrderById(
        orderId,
        Number(restaurantId),
        courierId,
      );
      if (!courierOrder) {
        throw new Error('Pedido não encontrado nas suas entregas.');
      }
      return courierOrder;
    }

    if (normalizedRole === UserRole.FUNCIONARIO) {
      if (normalizedSubRole === FuncionarioSubRole.GARCOM) {
        const readyTableOrder = await orderRepository.findReadyTableOrderById(
          orderId,
          restaurantId,
        );
        if (!readyTableOrder) {
          throw new Error('Pedido não encontrado na fila do garçom.');
        }
        return readyTableOrder;
      }

      if (normalizedSubRole === FuncionarioSubRole.COZINHA) {
        const operationalOrder = await orderRepository.findOperationalById(orderId, restaurantId);
        if (!operationalOrder) {
          throw new Error('Pedido não encontrado na fila da cozinha.');
        }
        return operationalOrder;
      }

      if (normalizedSubRole === FuncionarioSubRole.ATENDENTE) {
        const attendantOrder = await orderRepository.findById(orderId, restaurantId);
        if (!attendantOrder) {
          throw new Error('Pedido não encontrado neste restaurante.');
        }
        return attendantOrder;
      }

      throw new Error('Funcionário sem perfil operacional válido.');
    }

    const order = await orderRepository.findById(orderId, restaurantId);
    if (!order) {
      throw new Error('Pedido não encontrado!');
    }

    return order;
  }
}

export default new GetOrderByIdService();
