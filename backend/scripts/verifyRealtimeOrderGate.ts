import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { io as ioClient, Socket } from "socket.io-client";

type NewOrderPayload = {
  id?: number | string;
};

const prisma = new PrismaClient();

async function postJson<TResponse>(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `POST ${url} falhou (${response.status}): ${JSON.stringify(data)}`,
    );
  }

  return data as TResponse;
}

async function patchJson<TResponse>(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `PATCH ${url} falhou (${response.status}): ${JSON.stringify(data)}`,
    );
  }

  return data as TResponse;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSocketConnect(socket: Socket, timeoutMs = 8000) {
  if (socket.connected) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout conectando no Socket.IO"));
    }, timeoutMs);

    const onConnect = () => {
      cleanup();
      resolve();
    };

    const onError = (error: unknown) => {
      cleanup();
      reject(
        new Error(
          `Falha no socket: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
    };

    socket.on("connect", onConnect);
    socket.on("connect_error", onError);
  });
}

async function waitForOrderEvent(
  seenOrderIds: Set<number>,
  targetOrderId: number,
  timeoutMs = 4000,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (seenOrderIds.has(targetOrderId)) {
      return true;
    }

    await wait(80);
  }

  return false;
}

async function main() {
  const suffix = Date.now();
  const baseUrl = String(
    process.env.BACKEND_URL || "http://127.0.0.1:3000",
  ).trim();
  const jwtSecret = String(process.env.JWT_SECRET || "").trim();

  if (!jwtSecret) {
    throw new Error("JWT_SECRET nao configurado para o teste realtime.");
  }

  const restaurant = await prisma.restaurant.create({
    data: {
      name: `Teste Realtime ${suffix}`,
      slug: `teste-realtime-${suffix}`,
      email: `teste.realtime.${suffix}@example.com`,
      active: true,
    },
  });

  let socket: Socket | null = null;

  try {
    const admin = await prisma.user.create({
      data: {
        name: `Admin Realtime ${suffix}`,
        email: `admin.realtime.${suffix}@example.com`,
        password: "123456",
        role: "ADMIN",
        active: true,
        restaurantId: restaurant.id,
      },
    });

    const opener = await prisma.user.create({
      data: {
        name: `Abertura Mesa ${suffix}`,
        email: `mesa.realtime.${suffix}@example.com`,
        password: "123456",
        role: "ADMIN",
        active: true,
        restaurantId: restaurant.id,
      },
    });

    const category = await prisma.category.create({
      data: {
        name: `Categoria Realtime ${suffix}`,
        restaurantId: restaurant.id,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: `Pizza Realtime ${suffix}`,
        price: 49.9,
        active: true,
        restaurantId: restaurant.id,
        categoryId: category.id,
      },
    });

    const table = await prisma.table.create({
      data: {
        number: 1,
        token: `mesa-token-${suffix}`,
        active: true,
        restaurantId: restaurant.id,
      },
    });

    const tableSession = await prisma.tableSession.create({
      data: {
        tableId: table.id,
        openedById: opener.id,
        pinHash: `hash-${suffix}`,
        sessionToken: `sessao-${suffix}`,
        status: "OPEN",
      },
    });

    const adminToken = jwt.sign(
      {
        id: admin.id,
        role: "ADMIN",
        restaurantId: restaurant.id,
        email: admin.email,
      },
      jwtSecret,
      { expiresIn: "2h" },
    );

    socket = ioClient(baseUrl, {
      auth: { token: adminToken },
      transports: ["websocket", "polling"],
      timeout: 8000,
    });

    await waitForSocketConnect(socket, 8000);

    const seenOrderIds = new Set<number>();

    socket.on("new-order", (payload: NewOrderPayload) => {
      const orderId = Number(payload?.id || 0);
      if (Number.isInteger(orderId) && orderId > 0) {
        seenOrderIds.add(orderId);
      }
    });

    const baseOrderPayload = {
      restaurantId: restaurant.id,
      paymentMethod: "PIX",
      paid: false,
      customerName: "Cliente Realtime",
      customerCpf: "12345678901",
      customerPhone: "85999999999",
      items: [{ productId: product.id, quantity: 1 }],
    };

    const deliveryResponse = await postJson<{ id?: number }>(
      `${baseUrl}/orders`,
      {
        ...baseOrderPayload,
        type: "DELIVERY",
        address: "Rua A",
        number: "123",
        district: "Centro",
        city: "Fortaleza",
        state: "CE",
        zipCode: "60000000",
      },
    );

    const deliveryOrderId = Number(deliveryResponse?.id || 0);
    const deliveryAppearedBeforePayment = await waitForOrderEvent(
      seenOrderIds,
      deliveryOrderId,
      1200,
    );

    const retiradaResponse = await postJson<{ id?: number }>(
      `${baseUrl}/orders`,
      {
        ...baseOrderPayload,
        type: "RETIRADA",
      },
    );

    const retiradaOrderId = Number(retiradaResponse?.id || 0);
    const retiradaAppeared = await waitForOrderEvent(
      seenOrderIds,
      retiradaOrderId,
      3500,
    );

    const mesaResponse = await postJson<{ id?: number }>(
      `${baseUrl}/orders`,
      {
        ...baseOrderPayload,
        type: "MESA",
        tableId: table.id,
      },
      {
        "x-session-token": tableSession.sessionToken,
      },
    );

    const mesaOrderId = Number(mesaResponse?.id || 0);
    const mesaAppeared = await waitForOrderEvent(
      seenOrderIds,
      mesaOrderId,
      3500,
    );

    await patchJson(
      `${baseUrl}/orders/${deliveryOrderId}/confirm-payment`,
      {},
      {
        Authorization: `Bearer ${adminToken}`,
      },
    );

    const deliveryAppearedAfterPayment = await waitForOrderEvent(
      seenOrderIds,
      deliveryOrderId,
      3500,
    );

    const result = {
      deliveryAppearedBeforePayment,
      deliveryAppearedAfterPayment,
      retiradaAppeared,
      mesaAppeared,
    };

    console.log("=== RESULTADO TESTE REALTIME SOCKET ===");
    console.log(JSON.stringify(result, null, 2));

    const passed =
      deliveryAppearedBeforePayment === false &&
      deliveryAppearedAfterPayment === true &&
      retiradaAppeared === true &&
      mesaAppeared === true;

    if (!passed) {
      process.exitCode = 1;
      console.error(
        "FALHOU: comportamento realtime divergente da regra esperada.",
      );
      return;
    }

    console.log(
      "PASSOU: DELIVERY so entra no realtime apos pagamento; MESA/RETIRADA entram normalmente.",
    );
  } finally {
    if (socket) {
      socket.disconnect();
    }

    await prisma.orderItem.deleteMany({
      where: {
        order: {
          restaurantId: restaurant.id,
        },
      },
    });

    await prisma.order.deleteMany({
      where: {
        restaurantId: restaurant.id,
      },
    });

    await prisma.tableSession.deleteMany({
      where: {
        table: {
          restaurantId: restaurant.id,
        },
      },
    });

    await prisma.table.deleteMany({
      where: {
        restaurantId: restaurant.id,
      },
    });

    await prisma.product.deleteMany({
      where: {
        restaurantId: restaurant.id,
      },
    });

    await prisma.category.deleteMany({
      where: {
        restaurantId: restaurant.id,
      },
    });

    await prisma.user.deleteMany({
      where: {
        restaurantId: restaurant.id,
      },
    });

    await prisma.restaurant.delete({
      where: {
        id: restaurant.id,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error("Erro no teste realtime:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
