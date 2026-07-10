import type { Socket } from "socket.io";
import prisma from "../config/prisma.js";

type SocketUser = {
  id: number | string;
  role: string;
  restaurantId: number | string;
};

type SocketTableSession = {
  id: number | string;
  tableId: number | string;
  restaurantId: number | string;
};

type AppSocket = Socket & {
  user?: SocketUser;
  authType?: "user" | "table-session";
  tableSession?: SocketTableSession;
};

export function socketHandler(socket: AppSocket) {
  console.log("🔌 conectado:", socket.id);

  if (socket.authType === "table-session" && socket.tableSession) {
    const { id, tableId, restaurantId } = socket.tableSession;

    socket.join(`restaurant:${restaurantId}`);
    socket.join(`table:${tableId}`);
    socket.join(`table-session:${id}`);

    socket.on("disconnect", () => {
      console.log("❌ desconectado:", socket.id);
    });

    return;
  }

  const user = socket.user;
  if (!user) {
    socket.disconnect(true);
    return;
  }

  const { id, role, restaurantId } = user;

  socket.join(`restaurant:${restaurantId}`);
  socket.join(`user:${id}`);

  if (role === "FUNCIONARIO") {
    socket.join("kitchen");
    socket.join(`restaurant:${restaurantId}:kitchen`);
  }

  if (role === "MOTOQUEIRO") {
    socket.join("courier");
    socket.join(`restaurant:${restaurantId}:courier`);
  }

  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    socket.join("admin");
    socket.join(`restaurant:${restaurantId}:admin`);
  }

  if (role === "SUPER_ADMIN") {
    socket.join("super_admin");
  }

  socket.on("support:chat-send", async (rawPayload, ack) => {
    const reply =
      typeof ack === "function"
        ? ack
        : (_result: { ok: boolean; error?: string }) => {};

    const normalizedRole = String(role || "").toUpperCase();
    const isAdminRole =
      normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN";

    if (!isAdminRole) {
      reply({ ok: false, error: "Sem permissão para usar este chat." });
      return;
    }

    const normalizedMessage = String(rawPayload?.message || "")
      .replace(/\s+/g, " ")
      .trim();

    if (normalizedMessage.length < 2) {
      reply({ ok: false, error: "Digite uma mensagem válida." });
      return;
    }

    if (normalizedMessage.length > 1200) {
      reply({ ok: false, error: "Mensagem muito longa (máx. 1200)." });
      return;
    }

    let targetRestaurantId = Number(restaurantId || 0);

    if (normalizedRole === "SUPER_ADMIN") {
      targetRestaurantId = Number(rawPayload?.restaurantId || 0);
      if (!Number.isInteger(targetRestaurantId) || targetRestaurantId <= 0) {
        reply({
          ok: false,
          error: "Informe o restaurante para falar com o admin.",
        });
        return;
      }
    }

    if (!Number.isInteger(targetRestaurantId) || targetRestaurantId <= 0) {
      reply({ ok: false, error: "Restaurante inválido para este chat." });
      return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: {
        restaurantId: targetRestaurantId,
      },
      select: {
        plan: true,
      },
    });

    const plan = String(subscription?.plan || "").toUpperCase();
    const supportChatEnabledPlan =
      plan === "PROFISSIONAL" || plan === "PREMIUM";

    if (!supportChatEnabledPlan) {
      reply({
        ok: false,
        error:
          "Chat com Super Admin disponível apenas para planos Profissional e Premium.",
      });
      return;
    }

    let savedMessage;
    const senderRoleValue =
      normalizedRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
    const senderLabelValue =
      normalizedRole === "SUPER_ADMIN" ? "Super Admin" : "Admin";

    try {
      const insertedRows = await prisma.$queryRaw<
        Array<{
          id: number;
          message: string;
          senderRole: string;
          senderUserId: number | null;
          senderLabel: string;
          restaurantId: number;
          sentAt: Date;
        }>
      >`
        INSERT INTO "SupportChatMessage" (
          "restaurantId",
          "senderUserId",
          "senderRole",
          "senderLabel",
          "message"
        )
        VALUES (
          ${targetRestaurantId},
          ${Number(id || 0) || null},
          CAST(${senderRoleValue} AS "SupportChatSenderRole"),
          ${senderLabelValue},
          ${normalizedMessage}
        )
        RETURNING
          "id",
          "message",
          "senderRole",
          "senderUserId",
          "senderLabel",
          "restaurantId",
          "sentAt"
      `;

      savedMessage = insertedRows[0] || null;

      if (!savedMessage) {
        reply({ ok: false, error: "Não foi possível salvar a mensagem." });
        return;
      }
    } catch (error) {
      console.error("Erro ao salvar support chat message:", error);
      reply({ ok: false, error: "Não foi possível salvar a mensagem." });
      return;
    }

    const payload = {
      id: String(savedMessage.id),
      message: savedMessage.message,
      senderRole: savedMessage.senderRole,
      senderUserId: Number(savedMessage.senderUserId || 0) || 0,
      senderLabel: savedMessage.senderLabel,
      restaurantId: savedMessage.restaurantId,
      sentAt: savedMessage.sentAt?.toISOString?.() || new Date().toISOString(),
    };

    socket.to(`user:${id}`).emit("support:chat-message", payload);
    socket.emit("support:chat-message", payload);

    if (normalizedRole === "ADMIN") {
      socket.to("super_admin").emit("support:chat-message", payload);
      reply({ ok: true });
      return;
    }

    socket
      .to(`restaurant:${targetRestaurantId}:admin`)
      .emit("support:chat-message", payload);
    socket.to("super_admin").emit("support:chat-message", payload);
    reply({ ok: true });
  });

  socket.on("disconnect", () => {
    console.log("❌ desconectado:", socket.id);
  });
}
