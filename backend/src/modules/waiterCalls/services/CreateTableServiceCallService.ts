import { PlanType, Prisma, SubscriptionStatus, TableServiceCallType } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import tableServiceCallRepository from '../repositories/TableServiceCallRepository.js';
import { tableServiceCallEvents } from '../realtime/tableServiceCallEvents.js';
import {
  loadTablePaymentLedgerItems,
  lockTablePaymentSession,
} from '../../tableAccount/services/tablePaymentLedger.js';
import tableParticipantStateService from '../../tableSession/services/TableParticipantStateService.js';

type SessionCallInput = {
  sessionId: number;
  tableId: number;
  restaurantId: number;
  participantId: number;
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

  private async createWaiterCallIdempotently(input: {
    restaurantId: number;
    tableId: number;
    tableSessionId: number;
    db: Prisma.TransactionClient;
  }) {
    const existing = await tableServiceCallRepository.findActiveByTableAndType(
      input.restaurantId,
      input.tableId,
      TableServiceCallType.WAITER,
      input.db,
    );
    if (existing) return { call: existing, duplicate: true };

    try {
      const call = await tableServiceCallRepository.create(
        {
          restaurantId: input.restaurantId,
          tableId: input.tableId,
          tableSessionId: input.tableSessionId,
          type: TableServiceCallType.WAITER,
        },
        input.db,
      );
      return { call, duplicate: false };
    } catch (error: unknown) {
      if (isUniqueConflict(error)) {
        const concurrent = await tableServiceCallRepository.findActiveByTableAndType(
          input.restaurantId,
          input.tableId,
          TableServiceCallType.WAITER,
          input.db,
        );
        if (concurrent) return { call: concurrent, duplicate: true };
      }
      throw error;
    }
  }

  async execute({ sessionId, tableId, restaurantId, participantId, type }: SessionCallInput) {
    const normalizedSessionId = Number(sessionId);
    const normalizedTableId = Number(tableId);
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedParticipantId = Number(participantId);
    if (
      !Number.isInteger(normalizedSessionId) ||
      normalizedSessionId <= 0 ||
      !Number.isInteger(normalizedTableId) ||
      normalizedTableId <= 0 ||
      !Number.isInteger(normalizedRestaurantId) ||
      normalizedRestaurantId <= 0 ||
      !Number.isInteger(normalizedParticipantId) ||
      normalizedParticipantId <= 0
    ) {
      throw new Error('Sessão de mesa inválida para criar o chamado.');
    }

    const normalizedType = this.normalizeSessionCallType(type);
    const result = await prisma.$transaction(
      async (tx) => {
        await setTenantDbContext(tx, normalizedRestaurantId);
        await lockTablePaymentSession(tx, normalizedRestaurantId, normalizedSessionId);
        const context = await tableServiceCallRepository.findOpenSessionContext(
          normalizedSessionId,
          normalizedTableId,
          normalizedRestaurantId,
          tx,
        );
        if (!context) {
          throw new Error('A sessão desta mesa não está mais ativa. Escaneie o QR novamente.');
        }

        const participant = await tx.tableParticipant.findFirst({
          where: {
            id: normalizedParticipantId,
            restaurantId: normalizedRestaurantId,
            tableSessionId: normalizedSessionId,
            status: 'ACTIVE',
            revokedAt: null,
          },
          select: { id: true },
        });
        if (!participant) {
          throw new Error('Sua identificação nesta mesa não está mais ativa.');
        }

        const subscription = context.table.restaurant.subscription;
        const subscriptionIsActive =
          subscription?.status === SubscriptionStatus.ATIVA ||
          subscription?.status === SubscriptionStatus.TESTE;
        if (!subscriptionIsActive || subscription?.plan !== PlanType.PREMIUM) {
          throw new Error(
            'O atendimento pelo cardápio de mesa não está disponível neste restaurante.',
          );
        }

        const settings = context.table.restaurant.settings;
        if (settings?.tableOrderingEnabled === false) {
          throw new Error('O atendimento pelo cardápio de mesa está desativado neste restaurante.');
        }
        if (
          normalizedType === TableServiceCallType.WAITER &&
          settings?.waiterCallEnabled === false
        ) {
          throw new Error('Chamados ao garçom estão desativados neste restaurante.');
        }
        if (normalizedType === TableServiceCallType.BILL && settings?.billRequestEnabled === false) {
          throw new Error('Solicitações de conta estão desativadas neste restaurante.');
        }

        if (normalizedType === TableServiceCallType.WAITER) {
          return this.createWaiterCallIdempotently({
            restaurantId: normalizedRestaurantId,
            tableId: normalizedTableId,
            tableSessionId: normalizedSessionId,
            db: tx,
          });
        }

        const existing = await tableServiceCallRepository.findActiveBillByParticipant(
          normalizedRestaurantId,
          normalizedSessionId,
          normalizedParticipantId,
          tx,
        );
        if (existing) {
          await tableParticipantStateService.blockOrderingForBill(tx, {
            participantId: normalizedParticipantId,
            tableSessionId: normalizedSessionId,
            restaurantId: normalizedRestaurantId,
          });
          return { call: existing, duplicate: true };
        }

        const ledgerItems = await loadTablePaymentLedgerItems(
          tx,
          normalizedRestaurantId,
          normalizedSessionId,
        );
        const participantHasOutstandingItems = ledgerItems.some(
          (item) =>
            item.participantId === normalizedParticipantId &&
            !item.canceled &&
            item.projectedStatus !== 'REFUNDED' &&
            (item.availableCents > 0 || item.reservedCents > 0 || item.processingCents > 0),
        );
        if (!participantHasOutstandingItems) {
          throw new Error('Você não possui itens em aberto para pedir a conta.');
        }

        await tableParticipantStateService.blockOrderingForBill(tx, {
          participantId: normalizedParticipantId,
          tableSessionId: normalizedSessionId,
          restaurantId: normalizedRestaurantId,
        });
        const call = await tableServiceCallRepository.createBillForParticipant(
          {
            restaurantId: normalizedRestaurantId,
            tableId: normalizedTableId,
            tableSessionId: normalizedSessionId,
            participantId: normalizedParticipantId,
          },
          tx,
        );
        return { call, duplicate: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (!result.duplicate) {
      await emitCreated(result.call as unknown as Record<string, unknown>);
    }
    return result;
  }
}

export default new CreateTableServiceCallService();
