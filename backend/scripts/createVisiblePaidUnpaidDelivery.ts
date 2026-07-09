import "dotenv/config";
import { OrderType, PaymentMethod } from "@prisma/client";
import prisma from "../src/config/prisma.js";

async function resolveUserId(restaurantId: number) {
  const client = await prisma.user.findFirst({
    where: {
      restaurantId,
      active: true,
      role: "CLIENTE",
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  if (client) {
    return client.id;
  }

  const fallback = await prisma.user.findFirst({
    where: {
      restaurantId,
      active: true,
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  if (!fallback) {
    throw new Error(
      `Nenhum usuario ativo encontrado para o restaurante ${restaurantId}.`,
    );
  }

  return fallback.id;
}

async function resolveProduct(restaurantId: number) {
  const product = await prisma.product.findFirst({
    where: {
      restaurantId,
      active: true,
    },
    select: {
      id: true,
      price: true,
      name: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  if (!product) {
    throw new Error(
      `Nenhum produto ativo encontrado para o restaurante ${restaurantId}.`,
    );
  }

  return product;
}

(async () => {
  try {
    const restaurantId = Number(process.argv[2] || 1);
    const marker = `TESTE_FLUXO_${Date.now()}`;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true },
    });

    if (!restaurant) {
      throw new Error(`Restaurante ${restaurantId} nao encontrado.`);
    }

    const userId = await resolveUserId(restaurantId);
    const product = await resolveProduct(restaurantId);
    const itemPrice = Number(product.price);

    const createOrder = async (paid: boolean) => {
      return prisma.order.create({
        data: {
          total: itemPrice,
          status: "PENDENTE",
          type: OrderType.DELIVERY,
          paymentMethod: PaymentMethod.PIX,
          paid,
          paidAt: paid ? new Date() : null,
          observation: `${marker} | DELIVERY ${paid ? "PAGO" : "NAO_PAGO"}`,
          address: "Rua Teste Painel",
          number: "101",
          district: "Centro",
          city: "Fortaleza",
          state: "CE",
          zipCode: "60000000",
          userId,
          restaurantId,
          items: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                price: itemPrice,
                observation: `${marker} item`,
              },
            ],
          },
        },
        select: {
          id: true,
          status: true,
          type: true,
          paid: true,
          paidAt: true,
          observation: true,
          createdAt: true,
        },
      });
    };

    const unpaidOrder = await createOrder(false);
    const paidOrder = await createOrder(true);

    console.log(
      JSON.stringify(
        {
          restaurant,
          marker,
          unpaidOrder,
          paidOrder,
          hint: "Use o marker no campo de busca do painel para localizar os pedidos.",
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
