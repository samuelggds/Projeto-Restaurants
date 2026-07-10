import prisma from "../../../config/prisma.js";
import { io } from "../../../server.js";
import { notifyRestaurantOrderIssueReported } from "../../../services/customerNotifier.js";
import {
  addOrderIssueMessage,
  ensureOrderIssueThread,
  getOrderIssueThread,
  toOrderIssueThreadPayload,
} from "./orderIssueChatStore.js";

function buildOrderAddressLabel(order: {
  address?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}) {
  const parts = [
    String(order?.address || "").trim(),
    String(order?.number || "").trim(),
    String(order?.district || "").trim(),
    String(order?.city || "").trim(),
    String(order?.state || "").trim(),
    String(order?.zipCode || "").trim(),
  ].filter(Boolean);

  return parts.join(", ");
}

class ReportOrderIssueService {
  async execute(
    orderId: number | string,
    userId: number | string,
    restaurantId: number | string | null,
    issueMessage: string,
  ) {
    const normalizedOrderId = Number(orderId);
    const normalizedUserId = Number(userId);
    const normalizedRestaurantId = Number(restaurantId || 0);
    const normalizedIssueMessage = String(issueMessage || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error("Pedido inválido para relatar problema.");
    }

    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
      throw new Error("Usuário inválido para relatar problema.");
    }

    if (normalizedIssueMessage.length > 600) {
      throw new Error("Mensagem muito longa. Use no máximo 600 caracteres.");
    }

    const order = await prisma.order.findFirst({
      where: {
        id: normalizedOrderId,
        userId: normalizedUserId,
        ...(Number.isFinite(normalizedRestaurantId) &&
        normalizedRestaurantId > 0
          ? {
              restaurantId: normalizedRestaurantId,
            }
          : {}),
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
        user: {
          select: {
            name: true,
            phone: true,
          },
        },
        restaurant: {
          select: {
            name: true,
            whatsapp: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Pedido não encontrado para este usuário.");
    }

    const orderAddressLabel = buildOrderAddressLabel(order);
    const orderItemsSummary = Array.isArray(order?.items)
      ? order.items
          .map((item) => {
            const quantity = Number(item?.quantity || 0);
            const productName = String(item?.product?.name || "Item").trim();

            if (!productName) {
              return "";
            }

            return quantity > 0 ? `${quantity}x ${productName}` : productName;
          })
          .filter(Boolean)
      : [];

    const existingThread = await getOrderIssueThread(order.id);

    if (!existingThread && normalizedIssueMessage.length < 10) {
      throw new Error("Descreva o problema com pelo menos 10 caracteres.");
    }

    if (existingThread && normalizedIssueMessage.length < 2) {
      throw new Error("Digite uma mensagem para continuar o chat.");
    }

    if (existingThread?.isResolved) {
      throw new Error("Este problema já foi resolvido e o chat foi encerrado.");
    }

    await ensureOrderIssueThread({
      orderId: order.id,
      userId: order.userId,
      restaurantId: order.restaurantId,
      customerName: String(order?.user?.name || "Cliente").trim(),
      customerPhone: String(order?.user?.phone || "").trim(),
      orderStatus: String(order.status || ""),
      orderType: String(order.type || ""),
      paymentMethod: String(order.paymentMethod || ""),
      total: Number(order.total || 0),
      createdAt: order.createdAt.toISOString(),
      addressLabel: orderAddressLabel,
      itemsSummary: orderItemsSummary,
    });

    const { thread, chatMessage } = await addOrderIssueMessage({
      orderId: order.id,
      senderType: "CLIENT",
      senderName: String(order?.user?.name || "Cliente"),
      message: normalizedIssueMessage,
    });

    const threadPayload = toOrderIssueThreadPayload(thread);
    if (!threadPayload) {
      throw new Error("Não foi possível atualizar a conversa do pedido.");
    }

    const payload = {
      orderId: order.id,
      userId: order.userId,
      status: order.status,
      type: order.type,
      paymentMethod: order.paymentMethod,
      total: Number(order.total || 0),
      createdAt: order.createdAt,
      restaurantId: order.restaurantId,
      addressLabel: orderAddressLabel,
      itemsSummary: orderItemsSummary,
      customerName: String(order?.user?.name || "Cliente").trim(),
      customerPhone: String(order?.user?.phone || "").trim(),
      issueMessage: normalizedIssueMessage,
      reportedAt: chatMessage.sentAt,
      isResolved: threadPayload.isResolved,
      messages: threadPayload.messages,
    };

    notifyRestaurantOrderIssueReported({
      restaurantWhatsapp: order?.restaurant?.whatsapp,
      restaurantName: order?.restaurant?.name,
      orderId: order.id,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      issueMessage: payload.issueMessage,
      orderStatus: payload.status,
      orderType: payload.type,
      paymentMethod: payload.paymentMethod,
      total: payload.total,
      addressLabel: payload.addressLabel,
      itemsSummary: payload.itemsSummary,
      createdAt: payload.createdAt?.toISOString?.() || null,
    }).catch((error: unknown) => {
      console.error(
        "[RESTAURANT_ORDER_ISSUE_NOTIFICATION_UNHANDLED]",
        error instanceof Error ? error.message : String(error),
      );
    });

    io.to(`restaurant:${order.restaurantId}:admin`).emit(
      "order:issue-reported",
      payload,
    );
    io.to(`restaurant:${order.restaurantId}:admin`).emit(
      "order:issue-message",
      {
        ...threadPayload,
        message: chatMessage,
      },
    );
    io.to(`user:${order.userId}`).emit("order:issue-message", {
      ...threadPayload,
      message: chatMessage,
    });

    return {
      ...threadPayload,
      lastMessage: chatMessage,
      info: "Problema relatado para o admin com sucesso.",
    };
  }
}

export default new ReportOrderIssueService();
