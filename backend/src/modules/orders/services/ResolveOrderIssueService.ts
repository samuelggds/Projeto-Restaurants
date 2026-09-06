import { FuncionarioSubRole, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import { resolveOrderIssueThread, toOrderIssueThreadPayload } from './orderIssueChatStore.js';

class ResolveOrderIssueService {
  async execute({
    orderId,
    actorUserId,
    actorRole,
    actorSubRole,
    restaurantId,
  }: {
    orderId: number | string;
    actorUserId: number | string;
    actorRole: string;
    actorSubRole?: string | null;
    restaurantId: number | string | null;
  }) {
    const normalizedOrderId = Number(orderId);
    const normalizedActorUserId = Number(actorUserId);
    const normalizedRestaurantId = Number(restaurantId || 0);
    const normalizedRole = String(actorRole || '').toUpperCase();
    const normalizedSubRole = String(actorSubRole || '').toUpperCase();

    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error('Pedido inválido para resolver conversa.');
    }
    if (!Number.isInteger(normalizedActorUserId) || normalizedActorUserId <= 0) {
      throw new Error('Funcionário inválido para resolver conversa.');
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para resolver conversa.');
    }

    const isAdmin = normalizedRole === UserRole.ADMIN;
    const isAttendant =
      normalizedRole === UserRole.FUNCIONARIO &&
      normalizedSubRole === FuncionarioSubRole.ATENDENTE;
    if (!isAdmin && !isAttendant) {
      throw new Error('Seu perfil não pode encerrar atendimentos de pedidos.');
    }

    const [order, actorUser] = await Promise.all([
      prisma.order.findFirst({
        where: { id: normalizedOrderId, restaurantId: normalizedRestaurantId },
        select: { id: true, restaurantId: true, userId: true },
      }),
      prisma.user.findFirst({
        where: {
          id: normalizedActorUserId,
          restaurantId: normalizedRestaurantId,
          active: true,
          ...(isAdmin
            ? { role: UserRole.ADMIN }
            : { role: UserRole.FUNCIONARIO, subRole: FuncionarioSubRole.ATENDENTE }),
        },
        select: { name: true },
      }),
    ]);

    if (!order) throw new Error('Pedido não encontrado para este restaurante.');
    if (!actorUser) throw new Error('Funcionário sem acesso ao atendimento deste restaurante.');

    const resolvedByName = String(actorUser.name || 'Equipe').trim() || 'Equipe';
    const thread = await resolveOrderIssueThread({
      orderId: order.id,
      restaurantId: normalizedRestaurantId,
      resolvedByName,
    });

    const threadPayload = toOrderIssueThreadPayload(thread);
    if (!threadPayload) throw new Error('Não foi possível resolver a conversa do pedido.');

    const resolvedPayload = {
      orderId: order.id,
      isResolved: true,
      resolvedAt: threadPayload.resolvedAt,
      resolvedByName,
    };

    io.to(`restaurant:${order.restaurantId}:admin`).emit('order:issue-resolved', resolvedPayload);
    io.to(`restaurant:${order.restaurantId}:attendant`).emit('order:issue-resolved', resolvedPayload);
    io.to(`user:${order.userId}`).emit('order:issue-resolved', resolvedPayload);

    return {
      ...threadPayload,
      info: 'Problema marcado como resolvido e chat encerrado.',
    };
  }
}

export default new ResolveOrderIssueService();
