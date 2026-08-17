import type { Socket } from 'socket.io';
import prisma from '../config/prisma.js';
import {
  canSendSupportChat,
  getSupportMessageSender,
  isOperationalSupportReporter,
  normalizeSupportChatRole,
} from './supportChatPolicy.js';

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
  authType?: 'user' | 'table-session';
  tableSession?: SocketTableSession;
};

export function socketHandler(socket: AppSocket) {
  console.log('🔌 conectado:', socket.id);

  if (socket.authType === 'table-session' && socket.tableSession) {
    const { id, tableId, restaurantId } = socket.tableSession;

    socket.join(`restaurant:${restaurantId}`);
    socket.join(`table:${tableId}`);
    socket.join(`table-session:${id}`);

    socket.on('disconnect', () => {
      console.log('❌ desconectado:', socket.id);
    });

    return;
  }

  const user = socket.user;
  if (!user) {
    socket.disconnect(true);
    return;
  }

  const { id, role, restaurantId } = user;
  let lastLocationStoredAt = 0;

  socket.join(`restaurant:${restaurantId}`);
  socket.join(`user:${id}`);

  if (role === 'FUNCIONARIO') {
    socket.join('kitchen');
    socket.join(`restaurant:${restaurantId}:kitchen`);
  }

  if (role === 'MOTOQUEIRO') {
    socket.join('courier');
    socket.join(`restaurant:${restaurantId}:courier`);
  }

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    socket.join('admin');
    socket.join(`restaurant:${restaurantId}:admin`);
  }

  if (role === 'SUPER_ADMIN') {
    socket.join('super_admin');
  }

  socket.on('delivery:location:update', async (rawPayload, ack) => {
    const reply =
      typeof ack === 'function' ? ack : (_result: { ok: boolean; error?: string }) => {};

    if (String(role || '').toUpperCase() !== 'MOTOQUEIRO') {
      reply({
        ok: false,
        error: 'Somente motoqueiros podem enviar localização.',
      });
      return;
    }

    const receivedAt = Date.now();
    if (receivedAt - lastLocationStoredAt < 3_000) {
      reply({ ok: true });
      return;
    }

    const orderId = Number(rawPayload?.orderId || 0);
    const latitude = Number(rawPayload?.latitude);
    const longitude = Number(rawPayload?.longitude);
    const heading = Number(rawPayload?.heading);
    const speed = Number(rawPayload?.speed);
    const accuracy = Number(rawPayload?.accuracy);
    const sentAt =
      typeof rawPayload?.sentAt === 'string' && rawPayload.sentAt
        ? rawPayload.sentAt
        : new Date().toISOString();

    if (!Number.isInteger(orderId) || orderId <= 0) {
      reply({ ok: false, error: 'Pedido inválido para rastreio.' });
      return;
    }

    const hasValidCoordinates =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180;

    if (!hasValidCoordinates) {
      reply({ ok: false, error: 'Coordenadas inválidas.' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        restaurantId: true,
        type: true,
        status: true,
        assignedCourierId: true,
      },
    });

    if (!order) {
      reply({ ok: false, error: 'Pedido não encontrado.' });
      return;
    }

    if (Number(order.restaurantId || 0) !== Number(restaurantId || 0)) {
      reply({ ok: false, error: 'Pedido não pertence ao seu restaurante.' });
      return;
    }

    if (String(order.type || '').toUpperCase() !== 'DELIVERY') {
      reply({ ok: false, error: 'Rastreio disponível apenas para delivery.' });
      return;
    }

    if (String(order.status || '').toUpperCase() !== 'SAIU_PARA_ENTREGA') {
      reply({ ok: false, error: 'Rastreio disponível apenas em entrega.' });
      return;
    }

    if (Number(order.assignedCourierId || 0) !== Number(id || 0)) {
      reply({ ok: false, error: 'Esta entrega não está atribuída a você.' });
      return;
    }

    const payload = {
      orderId: order.id,
      latitude,
      longitude,
      heading: Number.isFinite(heading) ? heading : null,
      speed: Number.isFinite(speed) ? speed : null,
      accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? Math.round(accuracy) : null,
      sentAt,
      recordedAt: sentAt,
      updatedAt: new Date().toISOString(),
    };

    await prisma.deliveryLocation.create({
      data: {
        orderId: order.id,
        courierId: Number(id),
        latitude,
        longitude,
        heading: Number.isFinite(heading) ? heading : null,
        speed: Number.isFinite(speed) ? speed : null,
        accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
        recordedAt: new Date(sentAt),
      },
    });
    lastLocationStoredAt = receivedAt;

    socket.to(`user:${order.userId}`).emit('order:delivery-location', payload);
    socket.to(`restaurant:${order.restaurantId}`).emit('order:delivery-location', payload);

    reply({ ok: true });
  });

  socket.on('support:chat-send', async (rawPayload, ack) => {
    const reply =
      typeof ack === 'function' ? ack : (_result: { ok: boolean; error?: string }) => {};

    const normalizedRole = normalizeSupportChatRole(role);
    const isOperationalRole = isOperationalSupportReporter(normalizedRole);

    if (!canSendSupportChat(normalizedRole)) {
      reply({ ok: false, error: 'Sem permissão para usar este chat.' });
      return;
    }

    const normalizedMessage = String(rawPayload?.message || '')
      .replace(/\s+/g, ' ')
      .trim();

    if (normalizedMessage.length < 2) {
      reply({ ok: false, error: 'Digite uma mensagem válida.' });
      return;
    }

    if (normalizedMessage.length > 1200) {
      reply({ ok: false, error: 'Mensagem muito longa (máx. 1200).' });
      return;
    }

    let targetRestaurantId = Number(restaurantId || 0);

    if (normalizedRole === 'SUPER_ADMIN') {
      targetRestaurantId = Number(rawPayload?.restaurantId || 0);
      if (!Number.isInteger(targetRestaurantId) || targetRestaurantId <= 0) {
        reply({
          ok: false,
          error: 'Informe o restaurante para falar com o admin.',
        });
        return;
      }
    }

    if (!Number.isInteger(targetRestaurantId) || targetRestaurantId <= 0) {
      reply({ ok: false, error: 'Restaurante inválido para este chat.' });
      return;
    }

    if (!isOperationalRole) {
      const subscription = await prisma.subscription.findUnique({
        where: {
          restaurantId: targetRestaurantId,
        },
        select: {
          plan: true,
        },
      });

      const plan = String(subscription?.plan || '').toUpperCase();
      const supportChatEnabledPlan = plan === 'BASICO' || plan === 'PREMIUM';

      if (!supportChatEnabledPlan) {
        reply({
          ok: false,
          error: 'Chat com Super Admin disponível nos planos ativos do sistema.',
        });
        return;
      }
    }

    let savedMessage;
    const { senderRole: senderRoleValue, senderLabel: senderLabelValue } =
      getSupportMessageSender(normalizedRole);

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
        reply({ ok: false, error: 'Não foi possível salvar a mensagem.' });
        return;
      }
    } catch (error) {
      console.error('Erro ao salvar support chat message:', error);
      reply({ ok: false, error: 'Não foi possível salvar a mensagem.' });
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

    socket.to(`user:${id}`).emit('support:chat-message', payload);
    socket.emit('support:chat-message', payload);

    if (isOperationalRole) {
      socket.to(`restaurant:${targetRestaurantId}:admin`).emit('support:chat-message', payload);
      reply({ ok: true });
      return;
    }

    if (normalizedRole === 'ADMIN') {
      socket.to('super_admin').emit('support:chat-message', payload);
      reply({ ok: true });
      return;
    }

    socket.to(`restaurant:${targetRestaurantId}:admin`).emit('support:chat-message', payload);
    socket.to('super_admin').emit('support:chat-message', payload);
    reply({ ok: true });
  });

  socket.on('disconnect', () => {
    console.log('❌ desconectado:', socket.id);
  });
}
