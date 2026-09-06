import { FuncionarioSubRole, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { getOrderIssueThread, toOrderIssueThreadPayload } from './orderIssueChatStore.js';

class GetOrderIssueThreadService {
  async execute({
    orderId,
    requesterUserId,
    requesterRole,
    requesterSubRole,
    requesterRestaurantId,
    guestPublicId,
  }: {
    orderId: number | string;
    requesterUserId?: number | string | null;
    requesterRole: string;
    requesterSubRole?: string | null;
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
    const subRole = String(requesterSubRole || '').toUpperCase();
    const isRestaurantSupport =
      role === UserRole.ADMIN ||
      (role === UserRole.FUNCIONARIO && subRole === FuncionarioSubRole.ATENDENTE);
    const isGuest = Boolean(normalizedGuestPublicId);

    if (isRestaurantSupport) {
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
      return {
        ...(toOrderIssueThreadPayload(thread) || {
          orderId: order.id,
          isResolved: false,
          messages: [],
        }),
        restaurantId: normalizedRestaurantId,
      };
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
    return {
      ...(toOrderIssueThreadPayload(thread) || {
        orderId: order.id,
        isResolved: false,
        messages: [],
      }),
      restaurantId: order.restaurantId,
    };
  }
}

export default new GetOrderIssueThreadService();
