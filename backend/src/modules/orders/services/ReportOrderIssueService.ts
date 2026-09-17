import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import { notifyRestaurantOrderIssueReported } from '../../../services/customerNotifier.js';
import cancelOrderService from './CancelOrderService.js';
import {
  addOrderIssueMessage,
  ensureOrderIssueThread,
  getOrderIssueThread,
  toOrderIssueThreadPayload,
} from './orderIssueChatStore.js';

function buildOrderAddressLabel(order: {
  address?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}) {
  const parts = [
    String(order?.address || '').trim(),
    String(order?.number || '').trim(),
    String(order?.district || '').trim(),
    String(order?.city || '').trim(),
    String(order?.state || '').trim(),
    String(order?.zipCode || '').trim(),
  ].filter(Boolean);

  return parts.join(', ');
}

type Requester = {
  userId?: number | string | null;
  restaurantId?: number | string | null;
  role?: string | null;
  guestPublicId?: string | null;
};

type CancellationOutcome = {
  state: 'CANCELLED' | 'REQUESTED';
  message: string;
  refundStatus?: string | null;
};

const CANCELLATION_REQUEST_PREFIX = /^cancelamento\s*[—–-]\s*/iu;

class ReportOrderIssueService {
  async execute(orderId: number | string, requester: Requester, issueMessage: string) {
    const normalizedOrderId = Number(orderId);
    const normalizedUserId = Number(requester.userId || 0);
    const normalizedRestaurantId = Number(requester.restaurantId || 0);
    const guestPublicId = String(requester.guestPublicId || '').trim();
    const isGuest = Boolean(guestPublicId);
    const normalizedIssueMessage = String(issueMessage || '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error('Pedido inválido para relatar problema.');
    }

    if (!isGuest && (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0)) {
      throw new Error('Usuário inválido para relatar problema.');
    }

    if (normalizedIssueMessage.length > 600) {
      throw new Error('Mensagem muito longa. Use no máximo 600 caracteres.');
    }

    const order = await prisma.order.findFirst({
      where: isGuest
        ? {
            id: normalizedOrderId,
            publicId: guestPublicId,
          }
        : {
            id: normalizedOrderId,
            userId: normalizedUserId,
            ...(Number.isFinite(normalizedRestaurantId) && normalizedRestaurantId > 0
              ? { restaurantId: normalizedRestaurantId }
              : {}),
          },
      select: {
        id: true,
        publicId: true,
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
            product: { select: { name: true } },
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
      throw new Error(
        isGuest
          ? 'Este comprovante não pertence ao pedido informado.'
          : 'Pedido não encontrado para este usuário.',
      );
    }

    const orderAddressLabel = buildOrderAddressLabel(order);
    const orderItemsSummary = Array.isArray(order?.items)
      ? order.items
          .map((item) => {
            const quantity = Number(item?.quantity || 0);
            const productName = String(item?.product?.name || 'Item').trim();
            if (!productName) return '';
            return quantity > 0 ? `${quantity}x ${productName}` : productName;
          })
          .filter(Boolean)
      : [];

    const existingThread = await getOrderIssueThread(order.id, order.restaurantId);

    if (!existingThread && normalizedIssueMessage.length < 10) {
      throw new Error('Descreva o problema com pelo menos 10 caracteres.');
    }
    if (existingThread && normalizedIssueMessage.length < 2) {
      throw new Error('Digite uma mensagem para continuar o chat.');
    }
    if (existingThread?.isResolved) {
      throw new Error('Este problema já foi resolvido e o chat foi encerrado.');
    }

    await ensureOrderIssueThread({
      orderId: order.id,
      userId: order.userId,
      restaurantId: order.restaurantId,
      customerName: String(order?.user?.name || 'Cliente').trim(),
      customerPhone: String(order?.user?.phone || '').trim(),
      orderStatus: String(order.status || ''),
      orderType: String(order.type || ''),
      paymentMethod: String(order.paymentMethod || ''),
      total: Number(order.total || 0),
      createdAt: order.createdAt.toISOString(),
      addressLabel: orderAddressLabel,
      itemsSummary: orderItemsSummary,
    });

    const { chatMessage } = await addOrderIssueMessage({
      orderId: order.id,
      restaurantId: order.restaurantId,
      senderType: 'CLIENT',
      senderName: String(order?.user?.name || 'Cliente'),
      message: normalizedIssueMessage,
    });

    const isCancellationRequest = CANCELLATION_REQUEST_PREFIX.test(normalizedIssueMessage);
    let cancellation: CancellationOutcome | null = null;
    let effectiveOrderStatus = String(order.status || '');

    if (isCancellationRequest) {
      if (!isGuest && effectiveOrderStatus === 'PENDENTE') {
        try {
          const cancelledOrder = await cancelOrderService.execute(
            order.id,
            normalizedUserId,
            order.restaurantId,
          );
          effectiveOrderStatus = String(cancelledOrder?.status || effectiveOrderStatus);
          cancellation = {
            state: 'CANCELLED',
            message:
              'Seu motivo foi enviado ao restaurante e o pedido foi cancelado. Se houver pagamento online confirmado, acompanhe o status do estorno no pedido.',
            refundStatus: String(cancelledOrder?.refundStatus || '') || null,
          };
        } catch (error) {
          console.warn('[ORDER_SUPPORT_AUTO_CANCEL_NOT_COMPLETED]', {
            orderId: order.id,
            restaurantId: order.restaurantId,
            error: error instanceof Error ? error.message : String(error),
          });
          cancellation = {
            state: 'REQUESTED',
            message:
              'Seu pedido não pôde ser cancelado automaticamente. A solicitação e o motivo foram enviados ao restaurante para análise.',
          };
        }
      } else {
        cancellation = {
          state: 'REQUESTED',
          message: isGuest
            ? 'Sua solicitação de cancelamento e o motivo foram enviados ao restaurante para análise.'
            : 'Como o pedido já avançou, sua solicitação de cancelamento e o motivo foram enviados ao restaurante para análise.',
        };
      }

      await addOrderIssueMessage({
        orderId: order.id,
        restaurantId: order.restaurantId,
        senderType: 'ADMIN',
        senderName: 'Sistema',
        message: cancellation.message,
      });
    }

    const finalThread = await getOrderIssueThread(order.id, order.restaurantId);
    const threadPayload = toOrderIssueThreadPayload(finalThread);
    if (!threadPayload) throw new Error('Não foi possível atualizar a conversa do pedido.');

    const payload = {
      orderId: order.id,
      userId: order.userId,
      status: effectiveOrderStatus,
      type: order.type,
      paymentMethod: order.paymentMethod,
      total: Number(order.total || 0),
      createdAt: order.createdAt,
      restaurantId: order.restaurantId,
      addressLabel: orderAddressLabel,
      itemsSummary: orderItemsSummary,
      customerName: String(order?.user?.name || 'Cliente').trim(),
      customerPhone: String(order?.user?.phone || '').trim(),
      issueMessage: normalizedIssueMessage,
      reportedAt: chatMessage.sentAt,
      isResolved: threadPayload.isResolved,
      messages: threadPayload.messages,
      guest: isGuest,
      cancellation,
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
        '[RESTAURANT_ORDER_ISSUE_NOTIFICATION_UNHANDLED]',
        error instanceof Error ? error.message : String(error),
      );
    });

    io.to(`restaurant:${order.restaurantId}:admin`).emit('order:issue-reported', payload);
    io.to(`restaurant:${order.restaurantId}:admin`).emit('order:issue-message', {
      ...threadPayload,
      message: chatMessage,
    });
    if (!isGuest) {
      io.to(`user:${order.userId}`).emit('order:issue-message', {
        ...threadPayload,
        message: chatMessage,
      });
    }

    return {
      ...threadPayload,
      status: effectiveOrderStatus,
      cancellation,
      lastMessage: chatMessage,
      info:
        cancellation?.state === 'CANCELLED'
          ? 'Pedido cancelado e motivo registrado no atendimento.'
          : cancellation?.state === 'REQUESTED'
            ? 'Solicitação de cancelamento enviada ao restaurante.'
            : 'Mensagem enviada ao restaurante com sucesso.',
    };
  }
}

export default new ReportOrderIssueService();
