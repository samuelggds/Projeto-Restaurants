import prisma from '../../../config/prisma.js';
import { getOrderIssueThread, toOrderIssueThreadPayload } from './orderIssueChatStore.js';

class GetOrderIssueThreadService {
  async execute({
    orderId,
    requesterUserId,
    requesterRole,
    requesterRestaurantId,
    guestPublicId,
  }: {
    orderId: number | string;
    requesterUserId?: number | string | null;
    requesterRole: string;
    requesterRestaurantId: number | string | null;
    guestPublicId?: string | null;
  }) {
    const normalizedOrderId = Number(orderId);
    const normalizedUserId = Number(requesterUserId || 0);
    const normalizedRestaurantId = Number(requesterRestaurantId || 0);
    const normalizedGuestPublicId = String(guestPublicId || '').trim();

    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error('Pedido inválido para carregar conversa.');
    }

    const role = String(requesterRole || '').toUpperCase();
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    const isGuest = Boolean(normalizedGuestPublicId);

    if (isAdmin) {
      if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
        throw new Error('Restaurante inválido para carregar conversa.');
      }

      const order = await prisma.order.findFirst({
        where: {
          id: normalizedOrderId,
          restaurantId: normalizedRestaurantId,
        },
        select: { id: true },
      });

      if (!order) throw new Error('Pedido não encontrado para este restaurante.');
      const thread = await getOrderIssueThread(order.id, normalizedRestaurantId);
      return (
        toOrderIssueThreadPayload(thread) || {
          orderId: order.id,
          isResolved: false,
          messages: [],
        }
      );
    }

    if (!isGuest && (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0)) {
      throw new Error('Usuário inválido para carregar conversa.');
    }

    const order = await prisma.order.findFirst({
      where: isGuest
        ? { id: normalizedOrderId, publicId: normalizedGuestPublicId }
        : { id: normalizedOrderId, userId: normalizedUserId },
      select: {
        id: true,
        restaurantId: true,
      },
    });

    if (!order) {
      throw new Error(
        isGuest
          ? 'Este comprovante não pertence ao pedido informado.'
          : 'Pedido não encontrado para este usuário.',
      );
    }

    const thread = await getOrderIssueThread(order.id, order.restaurantId);
    return (
      toOrderIssueThreadPayload(thread) || {
        orderId: order.id,
        isResolved: false,
        messages: [],
      }
    );
  }
}

export default new GetOrderIssueThreadService();
