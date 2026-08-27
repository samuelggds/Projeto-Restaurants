import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import {
  addOrderIssueMessage,
  ensureOrderIssueThread,
  getOrderIssueThread,
  toOrderIssueThreadPayload,
} from './orderIssueChatStore.js';

class ReplyOrderIssueService {
  async execute({
    orderId,
    restaurantId,
    adminUserId,
    replyMessage,
  }: {
    orderId: number | string;
    restaurantId: number | string | null;
    adminUserId: number | string;
    replyMessage: string;
  }) {
    const normalizedOrderId = Number(orderId);
    const normalizedRestaurantId = Number(restaurantId || 0);
    const normalizedAdminUserId = Number(adminUserId);
    const normalizedReplyMessage = String(replyMessage || '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error('Pedido inválido para responder.');
    }

    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para responder.');
    }

    if (!Number.isInteger(normalizedAdminUserId) || normalizedAdminUserId <= 0) {
      throw new Error('Admin inválido para responder.');
    }

    if (normalizedReplyMessage.length < 2) {
      throw new Error('Digite uma resposta para o cliente.');
    }

    if (normalizedReplyMessage.length > 600) {
      throw new Error('Resposta muito longa. Use no máximo 600 caracteres.');
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
          user: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: {
          id: normalizedAdminUserId,
        },
        select: {
          name: true,
        },
      }),
    ]);

    if (!order) {
      throw new Error('Pedido não encontrado para este restaurante.');
    }

    const existingThread = await getOrderIssueThread(order.id);
    if (!existingThread) {
      throw new Error('Cliente ainda não iniciou conversa neste pedido.');
    }

    if (existingThread.isResolved) {
      throw new Error('Este problema já foi resolvido e o chat foi encerrado.');
    }

    await ensureOrderIssueThread({
      orderId: order.id,
      userId: order.userId,
      restaurantId: order.restaurantId,
      customerName: String(order?.user?.name || 'Cliente').trim(),
      customerPhone: existingThread.customerPhone || '',
      orderStatus: String(existingThread.orderStatus || ''),
      orderType: String(existingThread.orderType || ''),
      paymentMethod: String(existingThread.paymentMethod || ''),
      total: Number(existingThread.total || 0),
      createdAt: existingThread.orderCreatedAt.toISOString(),
      addressLabel: existingThread.addressLabel || '',
      itemsSummary: Array.isArray(existingThread.itemsSummary) ? existingThread.itemsSummary : [],
    });

    const adminName = String(adminUser?.name || 'Admin').trim() || 'Admin';
    const { thread, chatMessage } = await addOrderIssueMessage({
      orderId: order.id,
      senderType: 'ADMIN',
      senderName: adminName,
      message: normalizedReplyMessage,
    });

    const threadPayload = toOrderIssueThreadPayload(thread);
    if (!threadPayload) {
      throw new Error('Não foi possível atualizar a conversa do pedido.');
    }

    io.to(`restaurant:${order.restaurantId}:admin`).emit('order:issue-message', {
      ...threadPayload,
      message: chatMessage,
    });
    io.to(`user:${order.userId}`).emit('order:issue-message', {
      ...threadPayload,
      message: chatMessage,
    });

    return {
      ...threadPayload,
      lastMessage: chatMessage,
      info: 'Resposta enviada para o cliente com sucesso.',
    };
  }
}

export default new ReplyOrderIssueService();
