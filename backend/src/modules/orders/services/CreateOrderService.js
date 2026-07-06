import prisma from "../../../config/prisma.js";
import orderRepository from "../repositories/OrderRepository.js";
import productRepository from "../../products/repositories/ProductRepository.js";
import { io } from "../../../server.js";
import { createOrderSchema } from "../../../validators/OrderValidator.js";
import splitService from "../../billing/services/SplitService.js";
import tableSessionRepository from "../../tableSession/repositories/TableSessionRepository.js";
import restaurantSettingsRepository from "../../restaurantSettings/repositories/RestaurantSettingsRepository.js";
import orderPixPaymentService from "./OrderPixPaymentService.js";
import { TableSessionStatus } from "@prisma/client";
import { notifyCustomerPaymentConfirmed } from "../../../services/customerNotifier.js";

class CreateOrderService {
  formatCpf(value) {
    const digits = String(value || "").replace(/\D/g, "");

    if (digits.length !== 11) {
      return null;
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  normalizePhone(value) {
    const digits = String(value || "").replace(/\D/g, "");

    if (!digits) {
      return null;
    }

    if (/^55\d{10,11}$/.test(digits)) {
      return `+${digits}`;
    }

    if (/^\d{10,11}$/.test(digits)) {
      return `+55${digits}`;
    }

    return null;
  }

  async resolveOrderUser({
    tx,
    userId,
    restaurantId,
    customerName,
    customerCpf,
    customerPhone,
  }) {
    const normalizedPhone = this.normalizePhone(customerPhone);

    if (userId) {
      if (normalizedPhone) {
        await tx.user.update({
          where: {
            id: Number(userId),
          },
          data: {
            phone: normalizedPhone,
          },
        });
      }

      return Number(userId);
    }

    const normalizedName = String(customerName || "").trim();
    const cpfDigits = String(customerCpf || "").replace(/\D/g, "");

    if (normalizedName.length < 2) {
      throw new Error("Informe o nome para finalizar o pedido.");
    }

    if (cpfDigits.length !== 11) {
      throw new Error("Informe um CPF válido com 11 dígitos.");
    }

    const guestEmail = `guest.${restaurantId}.${cpfDigits}@pecaja.local`;
    const guestPassword = `guest-${restaurantId}-${cpfDigits}`;

    const guestUser = await tx.user.upsert({
      where: {
        email: guestEmail,
      },
      update: {
        name: normalizedName,
        active: true,
        ...(normalizedPhone
          ? {
              phone: normalizedPhone,
            }
          : {}),
      },
      create: {
        name: normalizedName,
        email: guestEmail,
        password: guestPassword,
        role: "CLIENTE",
        active: true,
        phone: normalizedPhone,
        restaurantId,
      },
      select: {
        id: true,
      },
    });

    return Number(guestUser.id);
  }

  async execute({
    userId,
    restaurantId,
    userRestaurantId,
    tableSessionId,
    tableSessionTableId,
    type,
    paymentMethod,
    paid,
    pixPaymentId,
    paymentProof,
    observation,
    customerName,
    customerCpf,
    customerPhone,
    tableId,
    items,
    address,
    number,
    district,
    city,
    state,
    zipCode,
    paymentProofImage,
    complement,
  }) {
    const resolvedRestaurantId =
      Number(restaurantId) || Number(userRestaurantId) || null;
    if (!resolvedRestaurantId) {
      throw new Error("Restaurante não informado para o pedido");
    }

    createOrderSchema.parse({
      restaurantId: resolvedRestaurantId,
      customerName,
      customerCpf,
      customerPhone,
      type,
      paymentMethod,
      paid,
      pixPaymentId,
      paymentProof,
      observation,
      tableId,
      items,
      address,
      number,
      district,
      city,
      state,
      zipCode,
      complement,
      paymentProof,
      paymentProofImage,
    });

    if (type === "MESA") {
      if (!tableSessionId) {
        throw new Error(
          "Sessão da mesa não informada. Valide o PIN da mesa para continuar.",
        );
      }

      const session = await tableSessionRepository.findById(tableSessionId);

      if (!session || session.status !== TableSessionStatus.OPEN) {
        throw new Error(
          "Essa mesa está fechada. Gere um novo PIN com a equipe para continuar.",
        );
      }

      if (Number(tableId || 0) && Number(tableId) !== Number(session.tableId)) {
        throw new Error("Mesa do pedido não confere com a sessão validada.");
      }

      if (
        Number(tableSessionTableId || 0) > 0 &&
        Number(tableSessionTableId) !== Number(session.tableId)
      ) {
        throw new Error("Sessão da mesa inválida para este pedido.");
      }

      tableId = Number(session.tableId);
    }

    if (type === "DELIVERY") {
      const requiredAddressFields = [address, number, district, city, state]
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      if (requiredAddressFields.length < 5) {
        throw new Error(
          "Informe o endereço completo para pedidos de delivery.",
        );
      }
    }

    const normalizedPaymentMethod = String(paymentMethod || "").toUpperCase();
    const isPixDeliveryOrder =
      String(type || "").toUpperCase() === "DELIVERY" &&
      normalizedPaymentMethod === "PIX";

    if (isPixDeliveryOrder) {
      const publicSettings =
        await restaurantSettingsRepository.findPublicByRestaurantId(
          resolvedRestaurantId,
        );

      const pixKey = String(publicSettings?.pixKey || "").trim();
      const pixProvider = String(publicSettings?.pixProvider || "MERCADO_PAGO")
        .trim()
        .toUpperCase();

      if (!pixKey) {
        throw new Error(
          "Este restaurante não possui chave PIX cadastrada para finalizar o pagamento.",
        );
      }

      if (paid !== true) {
        throw new Error(
          "Pagamento PIX não confirmado. Finalize o PIX antes de criar o pedido.",
        );
      }

      if (!String(pixPaymentId || "").trim()) {
        throw new Error("Pagamento PIX inválido para confirmar o pedido.");
      }

      if (pixProvider === "MERCADO_PAGO") {
        await orderPixPaymentService.ensurePaymentApproved({
          paymentId: pixPaymentId,
          restaurantId: resolvedRestaurantId,
        });
      } else {
        const manualPrefix = `manual:${pixProvider}:${resolvedRestaurantId}:`;
        if (!String(pixPaymentId).startsWith(manualPrefix)) {
          throw new Error(
            "Pagamento PIX inválido para o provedor configurado.",
          );
        }

        const normalizedProofCode = String(paymentProof || "").trim();
        const normalizedProofImage = String(paymentProofImage || "").trim();
        const hasProofCode = normalizedProofCode.length >= 6;
        const hasProofImage =
          normalizedProofImage.startsWith("data:image/") &&
          normalizedProofImage.length >= 40;

        if (!hasProofCode && !hasProofImage) {
          throw new Error(
            "Informe o comprovante PIX (código da transação ou imagem) para finalizar o pedido.",
          );
        }

        if (hasProofImage && normalizedProofImage.length > 3_000_000) {
          throw new Error(
            "Imagem do comprovante muito grande. Envie uma imagem menor que 3MB.",
          );
        }
      }
    }

    const shouldMarkAsPaid = isPixDeliveryOrder && paid === true;

    const createdOrder = await prisma.$transaction(async (tx) => {
      const resolvedUserId = await this.resolveOrderUser({
        tx,
        userId,
        restaurantId: resolvedRestaurantId,
        customerName,
        customerCpf,
        customerPhone,
      });

      const products = await Promise.all(
        items.map((item) =>
          productRepository.findById(item.productId, resolvedRestaurantId, tx),
        ),
      );

      products.forEach((product, index) => {
        if (!product) {
          throw new Error(`Produto não encontrado: ${items[index].productId}`);
        }
      });

      const orderItems = items.map((item, index) => {
        const product = products[index];

        return {
          productId: product.id,
          quantity: item.quantity,
          price: Number(product.price),
          observation: item.observation,
        };
      });

      const total = orderItems.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
      );

      const systemFee = await splitService.execute({
        restaurantId: resolvedRestaurantId,
        orderTotal: total,
      });

      const formattedCpf = this.formatCpf(customerCpf);
      const guestSummary =
        !userId && customerName
          ? `Cliente: ${String(customerName).trim()}${formattedCpf ? ` | CPF: ${formattedCpf}` : ""}`
          : "";

      const pixProofSummary =
        isPixDeliveryOrder && String(paymentProof || "").trim()
          ? `Comprovante PIX: ${String(paymentProof).trim()}`
          : "";

      const pixProofImageSummary =
        isPixDeliveryOrder && String(paymentProofImage || "").trim()
          ? "Comprovante PIX (imagem): anexado"
          : "";

      const mergedObservation = [
        guestSummary,
        pixProofSummary,
        pixProofImageSummary,
        observation,
      ]
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join(" | ");

      const order = await orderRepository.create(
        {
          total,
          systemFee,
          type,
          paymentMethod,
          paid: shouldMarkAsPaid,
          paymentProof: String(paymentProof || "").trim() || null,
          paymentProofImage: String(paymentProofImage || "").trim() || null,
          observation: mergedObservation || null,
          userId: resolvedUserId,
          restaurantId: resolvedRestaurantId,
          tableId,
          address,
          number,
          district,
          city,
          state,
          zipCode,
          complement,
        },
        tx,
      );

      await tx.orderItem.createMany({
        data: orderItems.map((item) => ({
          ...item,
          orderId: order.id,
        })),
      });

      return orderRepository.findById(order.id, resolvedRestaurantId, tx);
    });

    io.emit("new-order", createdOrder);

    if (shouldMarkAsPaid) {
      io.to(`user:${createdOrder.userId}`).emit("payment-confirmed", {
        orderId: createdOrder.id,
        paymentMethod: normalizedPaymentMethod,
        paid: true,
        status: createdOrder.status,
      });

      notifyCustomerPaymentConfirmed({
        customerPhone: createdOrder?.user?.phone || customerPhone,
        customerName: createdOrder?.user?.name || customerName,
        restaurantName: createdOrder?.restaurant?.name,
        restaurantWhatsapp: createdOrder?.restaurant?.whatsapp,
        orderId: createdOrder?.id,
        total: createdOrder?.total,
        paymentMethod: normalizedPaymentMethod,
      }).catch((error) => {
        console.error(
          "[CUSTOMER_NOTIFICATION_UNHANDLED]",
          error?.message || error,
        );
      });
    }

    return createdOrder;
  }
}

export default new CreateOrderService();
