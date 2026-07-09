import "dotenv/config";
import jwt from "jsonwebtoken";
import prisma from "../src/config/prisma.js";

function buildToken(
  userId: number,
  restaurantId: number,
  email: string | null,
) {
  const secret = String(process.env.JWT_SECRET || "").trim();

  if (!secret) {
    throw new Error("JWT_SECRET nao configurado.");
  }

  return jwt.sign(
    {
      id: userId,
      role: "CLIENTE",
      restaurantId,
      email,
    },
    secret,
    { expiresIn: "30m" },
  );
}

(async () => {
  try {
    const restaurantId = Number(process.argv[2] || 1);
    const baseUrl = String(
      process.env.BACKEND_URL || "http://127.0.0.1:3000",
    ).trim();
    const marker = `TESTE_CANCEL_CARTAO_${Date.now()}`;

    const user = await prisma.user.findFirst({
      where: {
        restaurantId,
        active: true,
        role: "CLIENTE",
      },
      select: {
        id: true,
        email: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    if (!user) {
      throw new Error(
        `Nenhum cliente ativo encontrado para restaurante ${restaurantId}.`,
      );
    }

    const product = await prisma.product.findFirst({
      where: {
        restaurantId,
        active: true,
      },
      select: {
        id: true,
        price: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    if (!product) {
      throw new Error(
        `Nenhum produto ativo encontrado para restaurante ${restaurantId}.`,
      );
    }

    const price = Number(product.price || 0);

    const paidCardOrder = await prisma.order.create({
      data: {
        total: price,
        status: "PENDENTE",
        type: "DELIVERY",
        paymentMethod: "CARTAO",
        paid: true,
        paidAt: new Date(),
        cardCheckoutSessionId: `mp_pref:teste-${Date.now()}`,
        observation: `${marker} | CARTAO_PAGO`,
        address: "Rua Teste",
        number: "10",
        district: "Centro",
        city: "Fortaleza",
        state: "CE",
        zipCode: "60000000",
        userId: user.id,
        restaurantId,
      },
      select: {
        id: true,
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: paidCardOrder.id,
        productId: product.id,
        quantity: 1,
        price,
      },
    });

    const token = buildToken(user.id, restaurantId, user.email);

    const response = await fetch(
      `${baseUrl}/orders/${paidCardOrder.id}/cancel`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );

    const body = await response.json().catch(() => ({}));

    const after = await prisma.order.findUnique({
      where: { id: paidCardOrder.id },
      select: {
        id: true,
        status: true,
        paid: true,
        cardCheckoutSessionId: true,
      },
    });

    console.log(
      JSON.stringify(
        {
          marker,
          restaurantId,
          orderId: paidCardOrder.id,
          http: {
            status: response.status,
            ok: response.ok,
          },
          body,
          after,
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
