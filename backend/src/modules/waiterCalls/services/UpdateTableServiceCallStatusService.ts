import { TableServiceCallStatus, UserRole } from '@prisma/client';
import tableServiceCallRepository from '../repositories/TableServiceCallRepository.js';
import { tableServiceCallEvents } from '../realtime/tableServiceCallEvents.js';

type Input = {
  id: number | string;
  restaurantId: number;
  actorUserId: number;
  actorRole: string;
  status: string;
};

class UpdateTableServiceCallStatusService {
  async execute({ id, restaurantId, actorUserId, actorRole, status }: Input) {
    const normalizedId = Number(id);
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedActorId = Number(actorUserId);
    const normalizedStatus = String(status || '').trim().toUpperCase();

    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      throw new Error('Chamado inválido.');
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante não identificado para atualizar o chamado.');
    }
    if (!Number.isInteger(normalizedActorId) || normalizedActorId <= 0) {
      throw new Error('Funcionário não identificado para atualizar o chamado.');
    }
    if (
      normalizedStatus !== TableServiceCallStatus.IN_PROGRESS &&
      normalizedStatus !== TableServiceCallStatus.RESOLVED
    ) {
      throw new Error('Use IN_PROGRESS para assumir ou RESOLVED para concluir o chamado.');
    }

    const current = await tableServiceCallRepository.findByIdForRestaurant(
      normalizedId,
      normalizedRestaurantId,
    );
    if (!current) {
      // Intentionally indistinguishable from a missing id in another tenant.
      throw new Error('Chamado não encontrado neste restaurante.');
    }

    if (current.status === normalizedStatus) {
      return current;
    }

    if (normalizedStatus === TableServiceCallStatus.IN_PROGRESS) {
      if (current.status !== TableServiceCallStatus.WAITING) {
        throw new Error('Somente chamados aguardando podem ser assumidos.');
      }
      const changed = await tableServiceCallRepository.assignIfWaiting(
        normalizedId,
        normalizedRestaurantId,
        normalizedActorId,
      );
      if (changed !== 1) {
        throw new Error('Este chamado foi assumido por outra pessoa. Atualize a tela.');
      }
    } else {
      if (current.status !== TableServiceCallStatus.IN_PROGRESS) {
        throw new Error('Assuma o chamado antes de concluí-lo.');
      }
      const isAdmin = String(actorRole || '').toUpperCase() === UserRole.ADMIN;
      if (!isAdmin && current.assignedToId !== normalizedActorId) {
        throw new Error('Somente o garçom que assumiu o chamado pode concluí-lo.');
      }
      const changed = await tableServiceCallRepository.resolveIfInProgress(
        normalizedId,
        normalizedRestaurantId,
        normalizedActorId,
      );
      if (changed !== 1) {
        throw new Error('Este chamado já foi atualizado. Atualize a tela.');
      }
    }

    const updated = await tableServiceCallRepository.findByIdForRestaurant(
      normalizedId,
      normalizedRestaurantId,
    );
    if (!updated) {
      throw new Error('Chamado não encontrado após a atualização.');
    }

    try {
      await tableServiceCallEvents.updated(
        updated as unknown as Parameters<typeof tableServiceCallEvents.updated>[0],
      );
    } catch (error: unknown) {
      console.error(
        '[WAITER_CALL_REALTIME_ERROR]',
        error instanceof Error ? error.message : String(error),
      );
    }

    return updated;
  }
}

export default new UpdateTableServiceCallStatusService();
