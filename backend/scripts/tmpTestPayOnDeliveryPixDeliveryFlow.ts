import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });

import prisma from "../src/config/prisma.js";
import orderRepository from "../src/modules/orders/repositories/OrderRepository.js";
import updateOrderStatusService from "../src/modules/orders/services/UpdateOrderStatusService.js";
import { OrderStatus, UserRole } from "@prisma/client";

async function main() {
  const order = await prisma.order.findFirst({
    where: {
      type: "DELIVERY",
      status: "SAIU_PARA_ENTREGA",
      payOnDelivery: true,
      payOnDeliveryMethod: "PIX",
      paid: false,
    },
    orderBy: { id: "desc" },
    include: {
      user: { select: { phone: true } },
    },
  });

  if (!order) {
    throw new Error("Pedido PAY_ON_DELIVERY PIX nao encontrado para teste.");
  }

  const listedOrders = await orderRepository.findAll(order.restaurantId);
  const listedBefore = listedOrders.some(
    (o) => Number(o.id) === Number(order.id),
  );

  const code = String(order.user?.phone || "")
    .replace(/\D/g, "")
    .slice(-4);

  const updated = await updateOrderStatusService.execute(
    order.id,
    order.restaurantId,
    OrderStatus.ENTREGUE,
    UserRole.MOTOQUEIRO,
    code,
  );

  const reloaded = await prisma.order.findUnique({
    where: { id: order.id },
    select: {
      id: true,
      status: true,
      paid: true,
      paymentMethod: true,
      payOnDelivery: true,
      payOnDeliveryMethod: true,
      paidAt: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        orderId: order.id,
        listedBefore,
        codeUsed: code,
        updatedFromService: {
          id: updated?.id,
          status: updated?.status,
          paid: updated?.paid,
        },
        reloaded,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
