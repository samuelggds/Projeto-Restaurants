import { UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import { resolveOrderIssueThread, toOrderIssueThreadPayload } from './orderIssueChatStore.js';

class ResolveOrderIssueService {
  async execute({
    orderId,
    adminUserId,
    restaurantId,
  }: {
    orderId: number | string;
    adminUserId: number | string;
    restaurantId: number | string | null;
  }) {
    const normalizedOrderId = Number(orderId);
    const normalizedAdminUserId = Number(adminUserId);
    const normalizedRestaurantId = Number(restaurantId || 0);

    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error('Pedido inválido para resolver conversa.');
    }

    if (!Number.isInteger(normalizedAdminUserId) || normalizedAdminUserId <= 0) {
      throw new Error('Admin inválido para resolver conversa.');
    }

    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para resolver conversa.');
    }

    const [order, adminUser] = await Promise.all([
      prisma.order.findFirst({
        where: {
          id: normalizedOrderId,
          restaurantId: normalizedRestaurantId,
        },
        select: {
          id: true,
          restaurantId: true,
          userId: true,
        },
      }),
      prisma.user.findFirst({
        where: {
          id: normalizedAdminUserId,
          restaurantId: normalizedRestaurantId,
          role: UserRole.ADMIN,
          active: true,
        },
        select: {
          name: true,
        },
      }),
    ]);

    if (!order) {
      throw new Error('Pedido não encontrado para este restaurante.');
    }

    const resolvedByName = String(adminUser?.name || 'Admin').trim() || 'Admin';
    const thread = await resolveOrderIssueThread({
      orderId: order.id,
      restaurantId: normalizedRestaurantId,
      resolvedByName,
    });

    const threadPayload = toOrderIssueThreadPayload(thread);
    if (!threadPayload) {
      throw new Error('Não foi possível resolver a conversa do pedido.');
    }
    const resolvedPayload = {
      orderId: order.id,
      isResolved: true,
      resolvedAt: threadPayload.resolvedAt,
      resolvedByName,
    };

    io.to(`restaurant:${order.restaurantId}:admin`).emit('order:issue-resolved', resolvedPayload);
    io.to(`user:${order.userId}`).emit('order:issue-resolved', resolvedPayload);

    return {
      ...threadPayload,
      info: 'Problema marcado como resolvido e chat encerrado.',
    };
  }
}

export default new ResolveOrderIssueService();
