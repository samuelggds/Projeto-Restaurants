import prisma from '../../../config/prisma.js';
import type { OrderIssueSenderType } from '@prisma/client';

type EnsureThreadInput = {
  orderId: number;
  userId: number;
  restaurantId: number;
  customerName: string;
  customerPhone: string;
  orderStatus: string;
  orderType: string;
  paymentMethod: string;
  total: number;
  createdAt: string;
  addressLabel: string;
  itemsSummary: string[];
};

async function loadThread(orderId: number, restaurantId: number) {
  return prisma.orderIssueThread.findFirst({
    where: {
      orderId,
      restaurantId,
    },
    include: {
      messages: {
        orderBy: {
          sentAt: 'asc',
        },
      },
    },
  });
}

export async function ensureOrderIssueThread(input: EnsureThreadInput) {
  await prisma.orderIssueThread.upsert({
    where: {
      orderId: input.orderId,
      restaurantId: input.restaurantId,
    },
    create: {
      orderId: input.orderId,
      userId: input.userId,
      restaurantId: input.restaurantId,
      customerName: input.customerName,
      customerPhone: input.customerPhone || null,
      orderStatus: input.orderStatus,
      orderType: input.orderType,
      paymentMethod: input.paymentMethod || null,
      total: input.total,
      orderCreatedAt: new Date(input.createdAt),
      addressLabel: input.addressLabel || null,
      itemsSummary: input.itemsSummary,
    },
    update: {
      customerName: input.customerName,
      customerPhone: input.customerPhone || null,
      orderStatus: input.orderStatus,
      orderType: input.orderType,
      paymentMethod: input.paymentMethod || null,
      total: input.total,
      orderCreatedAt: new Date(input.createdAt),
      addressLabel: input.addressLabel || null,
      itemsSummary: input.itemsSummary,
    },
  });

  const thread = await loadThread(input.orderId, input.restaurantId);
  if (!thread) {
    throw new Error('Não foi possível preparar o chat do pedido.');
  }

  return thread;
}

export async function getOrderIssueThread(orderId: number, restaurantId: number) {
  return loadThread(orderId, restaurantId);
}

export async function addOrderIssueMessage({
  orderId,
  restaurantId,
  senderType,
  senderName,
  message,
}: {
  orderId: number;
  restaurantId: number;
  senderType: OrderIssueSenderType;
  senderName: string;
  message: string;
}) {
  const thread = await prisma.orderIssueThread.findFirst({
    where: {
      orderId,
      restaurantId,
    },
    select: {
      id: true,
      isResolved: true,
    },
  });

  if (!thread) {
    throw new Error('Conversa não encontrada para este pedido.');
  }

  if (thread.isResolved) {
    throw new Error('Este problema já foi resolvido e o chat foi encerrado.');
  }

  const chatMessage = await prisma.orderIssueMessage.create({
    data: {
      threadId: thread.id,
      senderType,
      senderName: String(senderName || senderType).trim() || senderType,
      message,
    },
  });

  const fullThread = await loadThread(orderId, restaurantId);
  if (!fullThread) {
    throw new Error('Não foi possível atualizar a conversa do pedido.');
  }

  return {
    thread: fullThread,
    chatMessage,
  };
}

export async function resolveOrderIssueThread({
  orderId,
  restaurantId,
  resolvedByName,
}: {
  orderId: number;
  restaurantId: number;
  resolvedByName: string;
}) {
  const thread = await prisma.orderIssueThread.findFirst({
    where: {
      orderId,
      restaurantId,
    },
    select: {
      id: true,
      isResolved: true,
    },
  });

  if (!thread) {
    throw new Error('Conversa não encontrada para este pedido.');
  }

  if (thread.isResolved) {
    const existing = await loadThread(orderId, restaurantId);
    if (!existing) {
      throw new Error('Conversa não encontrada para este pedido.');
    }
    return existing;
  }

  await prisma.orderIssueThread.update({
    where: {
      id: thread.id,
      restaurantId,
    },
    data: {
      isResolved: true,
      resolvedAt: new Date(),
      resolvedByName: String(resolvedByName || 'Admin').trim() || 'Admin',
    },
  });

  const resolved = await loadThread(orderId, restaurantId);
  if (!resolved) {
    throw new Error('Conversa não encontrada para este pedido.');
  }

  return resolved;
}

export function toOrderIssueThreadPayload(thread: Awaited<ReturnType<typeof loadThread>>) {
  if (!thread) {
    return null;
  }

  return {
    orderId: thread.orderId,
    userId: thread.userId,
    restaurantId: thread.restaurantId,
    customerName: thread.customerName,
    customerPhone: thread.customerPhone,
    status: thread.orderStatus,
    type: thread.orderType,
    paymentMethod: thread.paymentMethod,
    total: Number(thread.total || 0),
    createdAt: thread.orderCreatedAt?.toISOString?.() || null,
    addressLabel: thread.addressLabel,
    itemsSummary: thread.itemsSummary,
    isResolved: thread.isResolved,
    resolvedAt: thread.resolvedAt?.toISOString?.() || null,
    resolvedByName: thread.resolvedByName,
    messages: thread.messages.map((message) => ({
      id: String(message.id),
      senderType: message.senderType,
      senderName: message.senderName,
      message: message.message,
      sentAt: message.sentAt?.toISOString?.() || null,
    })),
    updatedAt: thread.updatedAt?.toISOString?.() || null,
  };
}
