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

async function createPaidCardOrder(
  restaurantId: number,
  userId: number,
  productId: number,
  price: number,
  cardCheckoutSessionId: string,
  marker: string,
) {
  const order = await prisma.order.create({
    data: {
      total: price,
      status: "PENDENTE",
      type: "DELIVERY",
      paymentMethod: "CARTAO",
      paid: true,
      paidAt: new Date(),
      cardCheckoutSessionId,
      observation: `${marker} | ${cardCheckoutSessionId}`,
      address: "Rua Teste",
      number: "20",
      district: "Centro",
      city: "Fortaleza",
      state: "CE",
      zipCode: "60000000",
      userId,
      restaurantId,
    },
    select: {
      id: true,
      cardCheckoutSessionId: true,
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId,
      quantity: 1,
      price,
    },
  });

  return order;
}

async function cancelOrder(baseUrl: string, orderId: number, token: string) {
  const response = await fetch(`${baseUrl}/orders/${orderId}/cancel`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const body = await response.json().catch(() => ({}));
  const after = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      paid: true,
      cardCheckoutSessionId: true,
    },
  });

  return {
    orderId,
    http: {
      status: response.status,
      ok: response.ok,
    },
    body,
    after,
  };
}

(async () => {
  try {
    const restaurantId = Number(process.argv[2] || 1);
    const baseUrl = String(
      process.env.BACKEND_URL || "http://127.0.0.1:3000",
    ).trim();
    const marker = `TESTE_CANCEL_PAGBANK_${Date.now()}`;

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

    const chkOrder = await createPaidCardOrder(
      restaurantId,
      user.id,
      product.id,
      price,
      `pagbank_chk:CHK-${Date.now()}`,
      marker,
    );

    const txOrder = await createPaidCardOrder(
      restaurantId,
      user.id,
      product.id,
      price,
      `pagbank_tx:TRX-${Date.now()}`,
      marker,
    );

    const token = buildToken(user.id, restaurantId, user.email);

    const chkResult = await cancelOrder(baseUrl, chkOrder.id, token);
    const txResult = await cancelOrder(baseUrl, txOrder.id, token);

    console.log(
      JSON.stringify(
        {
          marker,
          restaurantId,
          chkResult,
          txResult,
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
