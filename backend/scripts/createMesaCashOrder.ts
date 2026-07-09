import "dotenv/config";
import prisma from "../src/config/prisma.js";

(async () => {
  try {
    const restaurantId = Number(process.argv[2] || 1);
    const baseUrl = String(
      process.env.BACKEND_URL || "http://127.0.0.1:3000",
    ).trim();
    const marker = `MESA_DINHEIRO_${Date.now()}`;

    const table = await prisma.table.findFirst({
      where: {
        restaurantId,
        active: true,
      },
      select: {
        id: true,
        number: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    if (!table) {
      throw new Error(
        `Nenhuma mesa ativa encontrada no restaurante ${restaurantId}.`,
      );
    }

    const openedBy = await prisma.user.findFirst({
      where: {
        restaurantId,
        active: true,
        role: {
          in: ["ADMIN", "SUPER_ADMIN", "FUNCIONARIO"],
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    if (!openedBy) {
      throw new Error(
        `Nenhum usuario ativo para abrir sessao no restaurante ${restaurantId}.`,
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
        name: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    if (!product) {
      throw new Error(
        `Nenhum produto ativo encontrado no restaurante ${restaurantId}.`,
      );
    }

    const sessionToken = `sessao-mesa-dinheiro-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    const session = await prisma.tableSession.create({
      data: {
        tableId: table.id,
        openedById: openedBy.id,
        pinHash: `hash-${Date.now()}`,
        sessionToken,
        status: "OPEN",
      },
      select: {
        id: true,
        tableId: true,
        sessionToken: true,
      },
    });

    const response = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-token": session.sessionToken,
      },
      body: JSON.stringify({
        restaurantId,
        type: "MESA",
        paymentMethod: "DINHEIRO",
        paid: false,
        tableId: table.id,
        customerName: "Cliente Mesa Dinheiro",
        customerCpf: "12345678909",
        customerPhone: "85999999999",
        observation: marker,
        items: [
          {
            productId: product.id,
            quantity: 1,
          },
        ],
      }),
    });

    const data = await response.json().catch(() => ({}));

    console.log(
      JSON.stringify(
        {
          marker,
          restaurantId,
          table: {
            id: table.id,
            number: table.number,
          },
          session,
          product: {
            id: product.id,
            name: product.name,
            price: String(product.price),
          },
          http: {
            status: response.status,
            ok: response.ok,
          },
          order: data,
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
