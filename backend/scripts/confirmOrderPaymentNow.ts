import "dotenv/config";
import prisma from "../src/config/prisma.js";
import jwt from "jsonwebtoken";

(async () => {
  try {
    const orderId = Number(process.argv[2] || 84);
    const restaurantId = Number(process.argv[3] || 1);
    const baseUrl = String(
      process.env.BACKEND_URL || "http://127.0.0.1:3000",
    ).trim();

    const admin = await prisma.user.findFirst({
      where: {
        restaurantId,
        active: true,
        role: {
          in: ["ADMIN", "SUPER_ADMIN"],
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        restaurantId: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    if (!admin) {
      throw new Error(
        `Nenhum admin ativo encontrado para restaurante ${restaurantId}.`,
      );
    }

    const secret = String(process.env.JWT_SECRET || "").trim();
    if (!secret) {
      throw new Error("JWT_SECRET nao configurado.");
    }

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        restaurantId: admin.restaurantId,
      },
      secret,
      { expiresIn: "30m" },
    );

    const response = await fetch(
      `${baseUrl}/orders/${orderId}/confirm-payment`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );

    const data = await response.json().catch(() => ({}));

    console.log(
      JSON.stringify(
        {
          orderId,
          restaurantId,
          status: response.status,
          ok: response.ok,
          data,
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
