import prisma from "../../../config/prisma.js";
import {
  getOrderIssueThread,
  toOrderIssueThreadPayload,
} from "./orderIssueChatStore.js";

class GetOrderIssueThreadService {
  async execute({
    orderId,
    requesterUserId,
    requesterRole,
    requesterRestaurantId,
  }: {
    orderId: number | string;
    requesterUserId: number | string;
    requesterRole: string;
    requesterRestaurantId: number | string | null;
  }) {
    const normalizedOrderId = Number(orderId);
    const normalizedUserId = Number(requesterUserId);
    const normalizedRestaurantId = Number(requesterRestaurantId || 0);

    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error("Pedido inválido para carregar conversa.");
    }

    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
      throw new Error("Usuário inválido para carregar conversa.");
    }

    const role = String(requesterRole || "").toUpperCase();
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

    if (isAdmin) {
      if (
        !Number.isInteger(normalizedRestaurantId) ||
        normalizedRestaurantId <= 0
      ) {
        throw new Error("Restaurante inválido para carregar conversa.");
      }

      const order = await prisma.order.findFirst({
        where: {
          id: normalizedOrderId,
          restaurantId: normalizedRestaurantId,
        },
        select: {
          id: true,
          userId: true,
          status: true,
          type: true,
          paymentMethod: true,
          total: true,
          createdAt: true,
          restaurantId: true,
          address: true,
          number: true,
          district: true,
          city: true,
          state: true,
          zipCode: true,
          user: {
            select: {
              name: true,
              phone: true,
            },
          },
          items: {
            select: {
              quantity: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new Error("Pedido não encontrado para este restaurante.");
      }

      const thread = await getOrderIssueThread(order.id);

      if (!thread) {
        return {
          orderId: order.id,
          isResolved: false,
          messages: [],
        };
      }

      const payload = toOrderIssueThreadPayload(thread);
      if (!payload) {
        return {
          orderId: order.id,
          isResolved: false,
          messages: [],
        };
      }

      return payload;
    }

    const order = await prisma.order.findFirst({
      where: {
        id: normalizedOrderId,
        userId: normalizedUserId,
      },
      select: {
        id: true,
      },
    });

    if (!order) {
      throw new Error("Pedido não encontrado para este usuário.");
    }

    const thread = await getOrderIssueThread(order.id);

    if (!thread) {
      return {
        orderId: order.id,
        isResolved: false,
        messages: [],
      };
    }

    const payload = toOrderIssueThreadPayload(thread);
    if (!payload) {
      return {
        orderId: order.id,
        isResolved: false,
        messages: [],
      };
    }

    return payload;
  }
}

export default new GetOrderIssueThreadService();
