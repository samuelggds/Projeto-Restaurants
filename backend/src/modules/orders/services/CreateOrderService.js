import prisma from "../../../config/prisma.js";
import orderRepository from "../repositories/OrderRepository.js";
import productRepository from "../../products/repositories/ProductRepository.js";
import { io } from "../../../server.js";
import { createOrderSchema } from "../../../validators/OrderValidator.js";
import splitService from "../../billing/services/SplitService.js";
import tableSessionRepository from "../../tableSession/repositories/TableSessionRepository.js";
import { TableSessionStatus } from "@prisma/client";

class CreateOrderService {
  formatCpf(value) {
    const digits = String(value || "").replace(/\D/g, "");

    if (digits.length !== 11) {
      return null;
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  async resolveOrderUser({
    tx,
    userId,
    restaurantId,
    customerName,
    customerCpf,
  }) {
    if (userId) {
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
      },
      create: {
        name: normalizedName,
        email: guestEmail,
        password: guestPassword,
        role: "CLIENTE",
        active: true,
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
    observation,
    customerName,
    customerCpf,
    tableId,
    items,
    address,
    number,
    district,
    city,
    state,
    zipCode,
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
      type,
      paymentMethod,
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

    const createdOrder = await prisma.$transaction(async (tx) => {
      const resolvedUserId = await this.resolveOrderUser({
        tx,
        userId,
        restaurantId: resolvedRestaurantId,
        customerName,
        customerCpf,
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

      const mergedObservation = [guestSummary, observation]
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join(" | ");

      const order = await orderRepository.create(
        {
          total,
          systemFee,
          type,
          paymentMethod,
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

    return createdOrder;
  }
}

export default new CreateOrderService();
