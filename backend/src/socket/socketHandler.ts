import type { Socket } from 'socket.io';
import { OrderStatus, OrderType, UserRole } from '@prisma/client';
import prisma from '../config/prisma.js';
import {
  canSendSupportChat,
  getSupportChatRecipientRooms,
  getSupportMessageSender,
  isOperationalSupportReporter,
  normalizeSupportChatRole,
} from './supportChatPolicy.js';
import { validateEmployeeIssuePayload } from './employeeIssuePayload.js';
import { validateDeliveryLocationPayload } from './deliveryLocationPayload.js';
import { isSocketAccountAuthorized } from './socketAccountPolicy.js';
import { safeErrorName } from '../services/telemetrySanitizer.js';
import { assertSocketAccess, SocketAccessDeniedError } from './socketAccessPolicy.js';

type SocketUser = {
  id: number | string;
  role: string;
  subRole?: string | null;
  restaurantId: number | string | null;
  authVersion?: number | null;
};

type SocketTableSession = {
  id: number | string;
  tableId: number | string;
  restaurantId: number | string;
};

type SocketWaitingTable = {
  id: number | string;
  number: number | string;
  restaurantId: number | string;
};

type AppSocket = Socket & {
  user?: SocketUser;
  authType?: 'user' | 'table-session' | 'table-waiting';
  tableSession?: SocketTableSession;
  waitingTable?: SocketWaitingTable;
};

function resolveSocketRevalidationMs() {
  const configured = Number(process.env.SOCKET_AUTH_REVALIDATE_MS || 30_000);
  return Math.min(Math.max(Number.isFinite(configured) ? configured : 30_000, 5_000), 5 * 60_000);
}

function startTenantAccessRevalidation(
  socket: AppSocket,
  role: string | null,
  restaurantId: number | string | null,
) {
  const timer = setInterval(() => {
    void assertSocketAccess(role, restaurantId).catch((error) => {
      if (error instanceof SocketAccessDeniedError) {
        socket.disconnect(true);
        return;
      }
      console.warn('[SOCKET_ACCESS_REVALIDATION_FAILED]', {
        restaurantId: Number(restaurantId || 0) || null,
        errorType: safeErrorName(error),
      });
    });
  }, resolveSocketRevalidationMs());
  timer.unref();
  return timer;
}

export function socketHandler(socket: AppSocket) {
  console.log('🔌 conectado:', socket.id);

  if (socket.authType === 'table-session' && socket.tableSession) {
    const { id, tableId, restaurantId } = socket.tableSession;
    const accessValidationTimer = startTenantAccessRevalidation(socket, null, restaurantId);

    socket.join(`table:${tableId}`);
    socket.join(`table-session:${id}`);

    socket.on('disconnect', () => {
      clearInterval(accessValidationTimer);
      console.log('❌ desconectado:', socket.id);
    });

    return;
  }

  if (socket.authType === 'table-waiting' && socket.waitingTable) {
    const accessValidationTimer = startTenantAccessRevalidation(
      socket,
      null,
      socket.waitingTable.restaurantId,
    );
    socket.join(`table-waiting:${socket.waitingTable.id}`);

    socket.on('disconnect', () => {
      clearInterval(accessValidationTimer);
      console.log('❌ desconectado:', socket.id);
    });

    return;
  }

  const user = socket.user;
  if (!user) {
    socket.disconnect(true);
    return;
  }

  const { id, role, subRole, restaurantId, authVersion } = user;
  const lastLocationStoredAtByOrder = new Map<number, number>();
  let accountValidationTimer: NodeJS.Timeout | null = null;

  socket.join(`user:${id}`);

  if (role === 'FUNCIONARIO' && String(subRole || '').toUpperCase() === 'COZINHA') {
    socket.join(`restaurant:${restaurantId}`);
    socket.join(`restaurant:${restaurantId}:kitchen`);
  }

  if (role === 'FUNCIONARIO' && String(subRole || '').toUpperCase() === 'GARCOM') {
    socket.join(`restaurant:${restaurantId}:waiter`);
  }

  if (role === 'FUNCIONARIO' && String(subRole || '').toUpperCase() === 'ATENDENTE') {
    socket.join(`restaurant:${restaurantId}:attendant`);
  }

  if (role === 'MOTOQUEIRO') {
    socket.join(`restaurant:${restaurantId}`);
    socket.join(`restaurant:${restaurantId}:courier`);
  }

  if (role === 'ADMIN') {
    socket.join(`restaurant:${restaurantId}`);
    socket.join(`restaurant:${restaurantId}:admin`);
  }

  if (role === 'SUPER_ADMIN') {
    socket.join('super_admin');
  }

  const revalidationMs = resolveSocketRevalidationMs();
  accountValidationTimer = setInterval(() => {
    void prisma.user
      .findUnique({
        where: { id: Number(id || 0) },
        select: {
          id: true,
          active: true,
          role: true,
          subRole: true,
          restaurantId: true,
          authVersion: true,
        },
      })
      .then(async (account) => {
        if (
          !isSocketAccountAuthorized(account, {
            id,
            role,
            subRole,
            restaurantId,
            authVersion,
          })
        ) {
          socket.disconnect(true);
          return;
        }

        await assertSocketAccess(role, restaurantId);
      })
      .catch((error) => {
        if (error instanceof SocketAccessDeniedError) {
          socket.disconnect(true);
          return;
        }
        console.warn('[SOCKET_ACCOUNT_REVALIDATION_FAILED]', {
          userId: Number(id || 0),
          errorType: safeErrorName(error),
        });
      });
  }, revalidationMs);
  accountValidationTimer.unref();

  socket.on('delivery:location:update', async (rawPayload, ack) => {
    const reply =
      typeof ack === 'function'
        ? ack
        : (_result: { ok: boolean; error?: string; throttled?: boolean }) => {};
    let locationOrderId = 0;

    try {
      if (String(role || '').toUpperCase() !== 'MOTOQUEIRO') {
        reply({
          ok: false,
          error: 'Somente motoqueiros podem enviar localização.',
        });
        return;
      }

      const receivedAt = Date.now();
      const validation = validateDeliveryLocationPayload(rawPayload, receivedAt);
      if ('error' in validation) {
        reply({ ok: false, error: validation.error });
        return;
      }

      const location = validation.value;
      locationOrderId = location.orderId;
      const lastStoredAt = lastLocationStoredAtByOrder.get(location.orderId) || 0;
      if (receivedAt - lastStoredAt < 3_000) {
        reply({ ok: true, throttled: true });
        return;
      }

      const order = await prisma.order.findFirst({
        where: { id: location.orderId, restaurantId: Number(restaurantId) },
        select: {
          id: true,
          userId: true,
          restaurantId: true,
          type: true,
          status: true,
          assignedCourierId: true,
          assignedCourier: {
            select: {
              id: true,
              restaurantId: true,
              role: true,
              active: true,
            },
          },
        },
      });

      if (!order) {
        reply({ ok: false, error: 'Pedido não encontrado.' });
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

      const assignedCourier = order.assignedCourier;
      const isAuthenticatedCourier =
        Number(order.assignedCourierId || 0) === Number(id || 0) &&
        Number(assignedCourier?.id || 0) === Number(id || 0) &&
        Number(assignedCourier?.restaurantId || 0) === Number(restaurantId || 0) &&
        String(assignedCourier?.role || '').toUpperCase() === 'MOTOQUEIRO' &&
        assignedCourier?.active === true;

      if (!isAuthenticatedCourier) {
        reply({ ok: false, error: 'Esta entrega não está atribuída à sua conta ativa.' });
        return;
      }

      // Repete a verificação após a consulta assíncrona para evitar que dois
      // eventos simultâneos ultrapassem o limite do mesmo pedido.
      const lastAuthorizedUpdateAt = lastLocationStoredAtByOrder.get(location.orderId) || 0;
      if (receivedAt - lastAuthorizedUpdateAt < 3_000) {
        reply({ ok: true, throttled: true });
        return;
      }
      lastLocationStoredAtByOrder.set(location.orderId, receivedAt);

      const savedLocation = await prisma.$transaction(async (tx) => {
        // O bloqueio da linha fecha a janela entre a autorização acima e a gravação.
        // Se a entrega for encerrada primeiro, o WHERE é reavaliado e nenhum GPS é salvo.
        const lockedOrders = await tx.$queryRaw<Array<{ id: number }>>`
          SELECT o."id"
          FROM "Order" AS o
          INNER JOIN "User" AS courier ON courier."id" = o."assignedCourierId"
          WHERE o."id" = ${order.id}
            AND o."restaurantId" = ${Number(restaurantId)}
            AND o."type" = CAST(${OrderType.DELIVERY} AS "OrderType")
            AND o."status" = CAST(${OrderStatus.SAIU_PARA_ENTREGA} AS "OrderStatus")
            AND o."assignedCourierId" = ${Number(id)}
            AND courier."restaurantId" = ${Number(restaurantId)}
            AND courier."role" = CAST(${UserRole.MOTOQUEIRO} AS "UserRole")
            AND courier."active" = TRUE
          FOR UPDATE OF o, courier
        `;

        if (lockedOrders.length !== 1) return null;

        return tx.deliveryLocation.create({
          data: {
            orderId: order.id,
            courierId: Number(id),
            latitude: location.latitude,
            longitude: location.longitude,
            heading: location.heading,
            speed: location.speed,
            accuracy: location.accuracy,
            recordedAt: location.recordedAt,
          },
          select: { recordedAt: true },
        });
      });

      if (!savedLocation) {
        lastLocationStoredAtByOrder.delete(location.orderId);
        reply({
          ok: false,
          error: 'A entrega foi encerrada ou não está mais atribuída à sua conta.',
        });
        return;
      }

      const payload = {
        orderId: order.id,
        restaurantId: order.restaurantId,
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading,
        speed: location.speed,
        accuracy: location.accuracy,
        sentAt: location.sentAt,
        recordedAt: savedLocation.recordedAt.toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // A localização é privada: somente o cliente dono do pedido e os admins
      // do mesmo restaurante recebem a posição em tempo real.
      socket.to(`user:${order.userId}`).emit('order:delivery-location', payload);
      socket.to(`restaurant:${order.restaurantId}:admin`).emit('order:delivery-location', payload);

      reply({ ok: true });
    } catch (error) {
      if (locationOrderId > 0) {
        lastLocationStoredAtByOrder.delete(locationOrderId);
      }
      console.error('[DELIVERY_LOCATION_UPDATE_FAILED]', {
        orderId: locationOrderId || null,
        courierId: Number(id || 0),
        restaurantId: Number(restaurantId || 0),
        errorType: safeErrorName(error),
      });
      reply({
        ok: false,
        error: 'Não foi possível atualizar a localização agora. Tente novamente.',
      });
    }
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

    const employeeIssue = validateEmployeeIssuePayload(rawPayload || {});
    let employeeIssueMessage: string | null = null;
    let employeeIssueReporterName: string | null = null;

    if (isOperationalRole && !employeeIssue.isEmployeeIssue) {
      reply({
        ok: false,
        error: 'Envie o problema pelo formulário de relato da sua área.',
      });
      return;
    }

    if (employeeIssue.isEmployeeIssue) {
      if (!isOperationalRole) {
        reply({
          ok: false,
          error: 'Esse tipo de relato está disponível apenas para funcionários.',
        });
        return;
      }

      if ('error' in employeeIssue) {
        reply({ ok: false, error: employeeIssue.error });
        return;
      }

      employeeIssueMessage = employeeIssue.message;
      employeeIssueReporterName = employeeIssue.reporterName;
    }

    const normalizedMessage = employeeIssueMessage
      ? employeeIssueMessage
      : String(rawPayload?.message || '')
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

    // O restaurante vem exclusivamente do token autenticado. A consulta abaixo também
    // impede que um token antigo, de um funcionário removido ou transferido de unidade,
    // continue enviando relatos para a administração anterior.
    if (isOperationalRole) {
      const activeEmployee = await prisma.user.findFirst({
        where: {
          id: Number(id || 0),
          restaurantId: targetRestaurantId,
          role: normalizedRole,
          active: true,
        },
        select: { id: true },
      });

      if (!activeEmployee) {
        reply({
          ok: false,
          error:
            'Seu acesso não está vinculado a este restaurante. Entre novamente ou fale com o administrador.',
        });
        return;
      }
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
    const senderLabel = employeeIssueReporterName
      ? `${senderLabelValue} · ${employeeIssueReporterName}`
      : senderLabelValue;

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
          "message",
          "issueStatus"
        )
        VALUES (
          ${targetRestaurantId},
          ${Number(id || 0) || null},
          CAST(${senderRoleValue} AS "SupportChatSenderRole"),
          ${senderLabel},
          ${normalizedMessage},
          ${employeeIssueReporterName ? 'OPEN' : null}
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
      console.error('Erro ao salvar relato no chat de suporte:', {
        error,
        restaurantId: targetRestaurantId,
        senderRole: senderRoleValue,
        isEmployeeIssue: Boolean(employeeIssueReporterName),
      });
      reply({
        ok: false,
        error: 'Não foi possível registrar o relato agora. Tente novamente em instantes.',
      });
      return;
    }

    const payload = {
      id: String(savedMessage.id),
      message: savedMessage.message,
      senderRole: savedMessage.senderRole,
      senderUserId: Number(savedMessage.senderUserId || 0) || 0,
      senderLabel: savedMessage.senderLabel,
      issueStatus: employeeIssueReporterName ? 'OPEN' : null,
      restaurantId: savedMessage.restaurantId,
      sentAt: savedMessage.sentAt?.toISOString?.() || new Date().toISOString(),
    };

    socket.to(`user:${id}`).emit('support:chat-message', payload);
    socket.emit('support:chat-message', payload);

    for (const room of getSupportChatRecipientRooms(normalizedRole, targetRestaurantId)) {
      socket.to(room).emit('support:chat-message', payload);
    }
    reply({ ok: true });
  });

  socket.on('disconnect', () => {
    if (accountValidationTimer) clearInterval(accountValidationTimer);
    console.log('❌ desconectado:', socket.id);
  });
}
