import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';

const ACTIVE_DELIVERY_STATUS = 'SAIU_PARA_ENTREGA';
const MAX_MESSAGE_LENGTH = 500;

type Actor = {
  userId?: number | null;
  role?: string | null;
  restaurantId?: number | null;
  guestPublicId?: string | null;
};

type OrderAccessRow = {
  id: number;
  publicId: string;
  restaurantId: number;
  userId: number | null;
  status: string;
  type: string;
  assignedCourierId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  courierName: string | null;
  restaurantName: string;
};

type ThreadRow = {
  id: number;
  orderId: number;
  restaurantId: number;
  customerUserId: number | null;
  courierId: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
};

type MessageRow = {
  id: bigint | number | string;
  threadId: number;
  senderRole: string;
  senderUserId: number | null;
  senderName: string;
  message: string;
  createdAt: Date;
};

function normalizeMessage(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function publicMessage(row: MessageRow) {
  return {
    id: String(row.id),
    senderRole: String(row.senderRole),
    senderName: String(row.senderName),
    message: String(row.message),
    createdAt: row.createdAt.toISOString(),
  };
}

class DeliveryChatService {
  private async loadOrder(orderId: number) {
    const rows = await prisma.$queryRaw<OrderAccessRow[]>`
      SELECT
        o."id",
        o."publicId",
        o."restaurantId",
        o."userId",
        o."status"::text AS "status",
        o."type"::text AS "type",
        o."assignedCourierId",
        customer."name" AS "customerName",
        customer."phone" AS "customerPhone",
        courier."name" AS "courierName",
        restaurant."name" AS "restaurantName"
      FROM "Order" o
      INNER JOIN "Restaurant" restaurant ON restaurant."id" = o."restaurantId"
      LEFT JOIN "User" customer ON customer."id" = o."userId"
      LEFT JOIN "User" courier ON courier."id" = o."assignedCourierId"
      WHERE o."id" = ${orderId}
      LIMIT 1
    `;
    return rows[0] || null;
  }

  private assertActorAccess(order: OrderAccessRow, actor: Actor) {
    if (String(order.type).toUpperCase() !== 'DELIVERY') {
      throw new Error('Chat disponível apenas para pedidos de delivery.');
    }

    const role = String(actor.role || '').toUpperCase();
    const userId = Number(actor.userId || 0);
    const restaurantId = Number(actor.restaurantId || 0);
    const guestPublicId = String(actor.guestPublicId || '').trim();

    const isCustomer =
      role === 'CLIENTE' &&
      ((userId > 0 && Number(order.userId || 0) === userId) ||
        (guestPublicId && guestPublicId === String(order.publicId)));
    const isCourier =
      role === 'MOTOQUEIRO' &&
      userId > 0 &&
      Number(order.assignedCourierId || 0) === userId &&
      Number(order.restaurantId) === restaurantId;

    if (!isCustomer && !isCourier) {
      throw new Error('Você não tem acesso à conversa deste pedido.');
    }

    return { isCustomer, isCourier };
  }

  private async ensureThread(order: OrderAccessRow) {
    if (!order.assignedCourierId) {
      throw new Error('O pedido ainda não possui motoqueiro responsável.');
    }

    const rows = await prisma.$queryRaw<ThreadRow[]>`
      INSERT INTO "DeliveryChatThread" (
        "orderId", "restaurantId", "customerUserId", "courierId", "status", "createdAt", "updatedAt"
      ) VALUES (
        ${order.id}, ${order.restaurantId}, ${order.userId}, ${order.assignedCourierId}, 'OPEN', NOW(), NOW()
      )
      ON CONFLICT ("orderId") DO UPDATE SET
        "courierId" = EXCLUDED."courierId",
        "customerUserId" = EXCLUDED."customerUserId",
        "updatedAt" = NOW()
      RETURNING *
    `;
    return rows[0];
  }

  private async loadMessages(threadId: number) {
    return prisma.$queryRaw<MessageRow[]>`
      SELECT "id", "threadId", "senderRole", "senderUserId", "senderName", "message", "createdAt"
      FROM "DeliveryChatMessage"
      WHERE "threadId" = ${threadId}
      ORDER BY "createdAt" ASC, "id" ASC
      LIMIT 200
    `;
  }

  private buildPayload(order: OrderAccessRow, thread: ThreadRow, messages: MessageRow[]) {
    return {
      order: {
        id: order.id,
        publicId: order.publicId,
        status: order.status,
        restaurantId: order.restaurantId,
        restaurantName: order.restaurantName,
        customerName: order.customerName || 'Cliente',
        customerPhone: order.customerPhone || null,
        courierId: order.assignedCourierId,
        courierName: order.courierName || 'Motoqueiro',
      },
      thread: {
        id: thread.id,
        status: thread.status,
        readOnly: String(order.status).toUpperCase() !== ACTIVE_DELIVERY_STATUS,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
        closedAt: thread.closedAt?.toISOString() || null,
      },
      messages: messages.map(publicMessage),
    };
  }

  async get(orderId: number, actor: Actor) {
    if (!Number.isInteger(orderId) || orderId <= 0) throw new Error('Pedido inválido.');
    const order = await this.loadOrder(orderId);
    if (!order) throw new Error('Pedido não encontrado.');
    this.assertActorAccess(order, actor);
    if (!order.assignedCourierId) throw new Error('A conversa ficará disponível quando a entrega começar.');

    const thread = await this.ensureThread(order);
    if (String(order.status).toUpperCase() !== ACTIVE_DELIVERY_STATUS && thread.status === 'OPEN') {
      await prisma.$executeRaw`
        UPDATE "DeliveryChatThread"
        SET "status" = 'CLOSED', "closedAt" = COALESCE("closedAt", NOW()), "updatedAt" = NOW()
        WHERE "id" = ${thread.id}
      `;
      thread.status = 'CLOSED';
      thread.closedAt = thread.closedAt || new Date();
    }
    const messages = await this.loadMessages(thread.id);
    return this.buildPayload(order, thread, messages);
  }

  async send(orderId: number, actor: Actor, rawMessage: unknown) {
    if (!Number.isInteger(orderId) || orderId <= 0) throw new Error('Pedido inválido.');
    const message = normalizeMessage(rawMessage);
    if (message.length < 1) throw new Error('Digite uma mensagem.');
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Mensagem muito longa. Use no máximo ${MAX_MESSAGE_LENGTH} caracteres.`);
    }

    const order = await this.loadOrder(orderId);
    if (!order) throw new Error('Pedido não encontrado.');
    const access = this.assertActorAccess(order, actor);
    if (String(order.status).toUpperCase() !== ACTIVE_DELIVERY_STATUS) {
      throw new Error('O chat é encerrado quando a entrega termina.');
    }
    if (!order.assignedCourierId) throw new Error('O pedido ainda não possui motoqueiro responsável.');

    const thread = await this.ensureThread(order);
    if (thread.status !== 'OPEN') throw new Error('Esta conversa já foi encerrada.');

    const senderRole = access.isCourier ? 'COURIER' : 'CUSTOMER';
    const senderUserId = Number(actor.userId || 0) || null;
    const senderName = access.isCourier ? order.courierName || 'Motoqueiro' : order.customerName || 'Cliente';
    const rows = await prisma.$queryRaw<MessageRow[]>`
      INSERT INTO "DeliveryChatMessage" (
        "threadId", "senderRole", "senderUserId", "senderName", "message", "createdAt"
      ) VALUES (
        ${thread.id}, ${senderRole}, ${senderUserId}, ${senderName}, ${message}, NOW()
      )
      RETURNING "id", "threadId", "senderRole", "senderUserId", "senderName", "message", "createdAt"
    `;
    await prisma.$executeRaw`
      UPDATE "DeliveryChatThread" SET "updatedAt" = NOW() WHERE "id" = ${thread.id}
    `;

    const chatMessage = publicMessage(rows[0]);
    const event = {
      orderId: order.id,
      restaurantId: order.restaurantId,
      courierId: order.assignedCourierId,
      customerUserId: order.userId,
      restaurantName: order.restaurantName,
      customerName: order.customerName || 'Cliente',
      customerPhone: order.customerPhone || null,
      message: chatMessage,
    };

    if (order.userId) io.to(`user:${order.userId}`).emit('delivery:chat-message', event);
    io.to(`user:${order.assignedCourierId}`).emit('delivery:chat-message', event);
    io.to(`restaurant:${order.restaurantId}:admin`).emit('delivery:chat-message', event);

    return event;
  }
}

export default new DeliveryChatService();
