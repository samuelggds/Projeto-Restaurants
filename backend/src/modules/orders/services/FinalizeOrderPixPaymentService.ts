import { io } from "../../../server.js";
import { notifyCustomerPaymentConfirmed } from "../../../services/customerNotifier.js";
import orderRepository from "../repositories/OrderRepository.js";
import orderPixPaymentService from "./OrderPixPaymentService.js";

type FinalizeOrderPixPaymentPayload = {
  orderId?: number | string | null;
  paymentId: string;
  restaurantId?: number | null;
  paymentProof?: string | null;
  paymentProofImage?: string | null;
  allowMissingOrder?: boolean;
};

class FinalizeOrderPixPaymentService {
  async execute({
    orderId,
    paymentId,
    restaurantId,
    paymentProof,
    paymentProofImage,
    allowMissingOrder = false,
  }: FinalizeOrderPixPaymentPayload) {
    const normalizedPaymentId = String(paymentId || "").trim();
    const normalizedPaymentProof = String(paymentProof || "").trim();
    const normalizedPaymentProofImage = String(paymentProofImage || "").trim();
    const isManualProvider = normalizedPaymentId.startsWith("manual:");
    const hasManualPaymentProof = normalizedPaymentProof.length >= 6;

    if (!normalizedPaymentId) {
      throw new Error("Pagamento PIX invalido.");
    }

    if (isManualProvider) {
      const paymentStatus = await orderPixPaymentService.getPaymentStatus({
        paymentId: normalizedPaymentId,
        restaurantId,
      });

      if (!paymentStatus.sameRestaurant) {
        throw new Error(
          "Este pagamento PIX nao pertence ao restaurante do pedido.",
        );
      }

      if (!hasManualPaymentProof) {
        throw new Error(
          "Informe o código/ID da transação PIX no comprovante para confirmar este pedido.",
        );
      }

      orderPixPaymentService.ensureManualPaymentConfirmationAllowed({
        paymentId: normalizedPaymentId,
        paymentProof: normalizedPaymentProof,
      });
    } else {
      await orderPixPaymentService.ensurePaymentApproved({
        paymentId: normalizedPaymentId,
        restaurantId,
      });
    }

    const normalizedRestaurantId = Number(restaurantId || 0) || undefined;
    const order = orderId
      ? await orderRepository.findById(
          orderId,
          Number(normalizedRestaurantId || 0),
        )
      : await orderRepository.findByPixPaymentId(
          normalizedPaymentId,
          normalizedRestaurantId,
        );

    if (!order) {
      if (allowMissingOrder) {
        return null;
      }

      throw new Error("Pedido PIX nao encontrado para este pagamento.");
    }

    if (String(order.pixPaymentId || "").trim() !== normalizedPaymentId) {
      throw new Error("Pagamento PIX nao corresponde ao pedido informado.");
    }

    if (order.paid === true) {
      return order;
    }

    const updatedOrder = isManualProvider
      ? await orderRepository.confirmPixPayment(order.id, order.restaurantId, {
          paymentProof: normalizedPaymentProof || null,
          paymentProofImage: normalizedPaymentProofImage || null,
        })
      : await orderRepository.confirmPayment(order.id, order.restaurantId);

    io.to(`restaurant:${updatedOrder.restaurantId}`).emit(
      "order:payment-confirmed",
      {
        orderId: updatedOrder.id,
        paid: true,
        paymentMethod: updatedOrder.paymentMethod,
      },
    );

    io.to(`user:${updatedOrder.userId}`).emit("payment-confirmed", {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
      status: updatedOrder.status,
    });

    io.to(`restaurant:${updatedOrder.restaurantId}`).emit(
      "new-order",
      updatedOrder,
    );
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit(
      "order:status-changed",
      updatedOrder,
    );
    io.to(`user:${updatedOrder.userId}`).emit(
      "order:status-changed",
      updatedOrder,
    );

    notifyCustomerPaymentConfirmed({
      customerPhone: updatedOrder?.user?.phone,
      customerName: updatedOrder?.user?.name,
      restaurantName: updatedOrder?.restaurant?.name,
      restaurantWhatsapp: updatedOrder?.restaurant?.whatsapp,
      orderId: updatedOrder?.id,
      total: updatedOrder?.total,
      paymentMethod: updatedOrder?.paymentMethod,
    }).catch((error: unknown) => {
      console.error(
        "[CUSTOMER_NOTIFICATION_UNHANDLED]",
        error instanceof Error ? error.message : String(error),
      );
    });

    return updatedOrder;
  }
}

export default new FinalizeOrderPixPaymentService();
