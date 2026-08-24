import { PlanType, SubscriptionStatus, TableServiceCallType } from '@prisma/client';
import tableServiceCallRepository from '../repositories/TableServiceCallRepository.js';
import { tableServiceCallEvents } from '../realtime/tableServiceCallEvents.js';

type SessionCallInput = {
  sessionId: number;
  tableId: number;
  restaurantId: number;
  type: TableServiceCallType | string;
};

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

async function emitCreated(call: Record<string, unknown>) {
  try {
    await tableServiceCallEvents.created(call as Parameters<typeof tableServiceCallEvents.created>[0]);
  } catch (error: unknown) {
    console.error(
      '[WAITER_CALL_REALTIME_ERROR]',
      error instanceof Error ? error.message : String(error),
    );
  }
}

class CreateTableServiceCallService {
  private normalizeSessionCallType(type: TableServiceCallType | string) {
    const normalized = String(type || '').trim().toUpperCase();
    if (normalized !== TableServiceCallType.WAITER && normalized !== TableServiceCallType.BILL) {
      throw new Error('Tipo de chamado inválido. Use WAITER ou BILL.');
    }
    return normalized as TableServiceCallType;
  }

  private async createIdempotently({
    restaurantId,
    tableId,
    tableSessionId,
    type,
  }: {
    restaurantId: number;
    tableId: number;
    tableSessionId: number;
    type: TableServiceCallType;
  }) {
    const existing = await tableServiceCallRepository.findActiveByTableAndType(
      restaurantId,
      tableId,
      type,
    );
    if (existing) {
      return { call: existing, duplicate: true };
    }

    try {
      const call = await tableServiceCallRepository.create({
        restaurantId,
        tableId,
        tableSessionId,
        type,
      });
      await emitCreated(call as unknown as Record<string, unknown>);
      return { call, duplicate: false };
    } catch (error: unknown) {
      // The partial unique index also protects the race between two concurrent
      // requests. Returning the active call makes the endpoint safely idempotent.
      if (isUniqueConflict(error)) {
        const concurrent = await tableServiceCallRepository.findActiveByTableAndType(
          restaurantId,
          tableId,
          type,
        );
        if (concurrent) {
          return { call: concurrent, duplicate: true };
        }
      }
      throw error;
    }
  }

  async execute({ sessionId, tableId, restaurantId, type }: SessionCallInput) {
    const normalizedSessionId = Number(sessionId);
    const normalizedTableId = Number(tableId);
    const normalizedRestaurantId = Number(restaurantId);
    if (
      !Number.isInteger(normalizedSessionId) ||
      normalizedSessionId <= 0 ||
      !Number.isInteger(normalizedTableId) ||
      normalizedTableId <= 0 ||
      !Number.isInteger(normalizedRestaurantId) ||
      normalizedRestaurantId <= 0
    ) {
      throw new Error('Sessão de mesa inválida para criar o chamado.');
    }

    const normalizedType = this.normalizeSessionCallType(type);
    const context = await tableServiceCallRepository.findOpenSessionContext(
      normalizedSessionId,
      normalizedTableId,
      normalizedRestaurantId,
    );
    if (!context) {
      throw new Error('A sessão desta mesa não está mais ativa. Escaneie o QR novamente.');
    }

    const subscription = context.table.restaurant.subscription;
    const subscriptionIsActive =
      subscription?.status === SubscriptionStatus.ATIVA ||
      subscription?.status === SubscriptionStatus.TESTE;
    if (!subscriptionIsActive || subscription?.plan !== PlanType.PREMIUM) {
      throw new Error('O atendimento pelo cardápio de mesa não está disponível neste restaurante.');
    }

    const settings = context.table.restaurant.settings;
    if (settings?.tableOrderingEnabled === false) {
      throw new Error('O atendimento pelo cardápio de mesa está desativado neste restaurante.');
    }
    if (normalizedType === TableServiceCallType.WAITER && settings?.waiterCallEnabled === false) {
      throw new Error('Chamados ao garçom estão desativados neste restaurante.');
    }
    if (normalizedType === TableServiceCallType.BILL && settings?.billRequestEnabled === false) {
      throw new Error('Solicitações de conta estão desativadas neste restaurante.');
    }

    return this.createIdempotently({
      restaurantId: normalizedRestaurantId,
      tableId: normalizedTableId,
      tableSessionId: normalizedSessionId,
      type: normalizedType,
    });
  }
}

export default new CreateTableServiceCallService();
