import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });

import prisma from "../src/config/prisma.js";
import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  UserRole,
} from "@prisma/client";

async function main() {
  const courier = await prisma.user.findFirst({
    where: { role: UserRole.MOTOQUEIRO, active: true },
    select: { restaurantId: true },
  });

  if (!courier?.restaurantId) {
    throw new Error("Motoqueiro ativo nao encontrado.");
  }

  const restaurantId = courier.restaurantId;

  let customer = await prisma.user.findFirst({
    where: { restaurantId, role: UserRole.CLIENTE, active: true },
    select: { id: true, phone: true, name: true },
    orderBy: { id: "asc" },
  });

  if (!customer) {
    customer = await prisma.user.create({
      data: {
        name: "Cliente Teste PayOnDelivery",
        email: `cliente.payondelivery.${Date.now()}@pizzaia.demo`,
        password: "123456",
        role: UserRole.CLIENTE,
        active: true,
        phone: "+5585999998888",
        restaurantId,
      },
      select: { id: true, phone: true, name: true },
    });
  }

  if (!customer.phone) {
    await prisma.user.update({
      where: { id: customer.id },
      data: { phone: "+5585999998888" },
    });
    customer = { ...customer, phone: "+5585999998888" };
  }

  const product = await prisma.product.findFirst({
    where: { restaurantId, active: true },
    select: { id: true, price: true },
    orderBy: { id: "asc" },
  });

  if (!product) {
    throw new Error("Produto ativo nao encontrado.");
  }

  const order = await prisma.order.create({
    data: {
      total: Number(product.price),
      status: OrderStatus.SAIU_PARA_ENTREGA,
      type: OrderType.DELIVERY,
      paymentMethod: PaymentMethod.PIX,
      payOnDelivery: true,
      payOnDeliveryMethod: PaymentMethod.PIX,
      paid: false,
      paidAt: null,
      address: "Rua Teste PayOnDelivery",
      number: "123",
      district: "Centro",
      city: "Fortaleza",
      state: "CE",
      zipCode: "60000000",
      observation: `TMP_PAY_ON_DELIVERY_PIX_${Date.now()}`,
      userId: customer.id,
      restaurantId,
      items: {
        create: [
          {
            productId: product.id,
            quantity: 1,
            price: Number(product.price),
          },
        ],
      },
    },
    select: {
      id: true,
      status: true,
      paid: true,
      paymentMethod: true,
      payOnDelivery: true,
      payOnDeliveryMethod: true,
      user: {
        select: { phone: true, name: true },
      },
    },
  });

  const code = String(order.user?.phone || "")
    .replace(/\D/g, "")
    .slice(-4);

  console.log(
    JSON.stringify(
      {
        orderId: order.id,
        status: order.status,
        paid: order.paid,
        paymentMethod: order.paymentMethod,
        payOnDelivery: order.payOnDelivery,
        payOnDeliveryMethod: order.payOnDeliveryMethod,
        customerName: order.user?.name,
        customerPhone: order.user?.phone,
        deliveryCode: code,
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
