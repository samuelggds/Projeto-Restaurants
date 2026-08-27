import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import type {
  TableAccountActor,
  TableAccountAdminSnapshotDto,
} from '../domain/tableAccountContracts.js';
import { canViewTableAccountFinancialHistory } from '../domain/tableAccountRules.js';
import tableAccountRepository from '../repositories/TableAccountRepository.js';
import { serializeTablePaymentIntentForAdmin, TablePaymentError } from './tablePaymentSupport.js';
import { expireTablePaymentReservations, lockTablePaymentSession } from './tablePaymentLedger.js';
import { buildTableAccountBaseSnapshot } from './GetCurrentTableAccountService.js';
import { tableAccountEvents } from '../realtime/tableAccountEvents.js';

export class GetTableAccountAdminSnapshotService {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async execute(input: {
    sessionPublicId: string;
    actor: TableAccountActor;
  }): Promise<TableAccountAdminSnapshotDto> {
    const restaurantId = Number(input.actor.restaurantId || 0);
    if (!canViewTableAccountFinancialHistory(input.actor, restaurantId)) {
      throw new TablePaymentError(
        'Somente o administrador ou um garçom deste restaurante pode consultar este histórico.',
        403,
        'TABLE_ACCOUNT_HISTORY_FORBIDDEN',
      );
    }

    const sessionPublicId = String(input.sessionPublicId || '').trim();
    const initial = await tableAccountRepository.findAdminSnapshotData(
      sessionPublicId,
      restaurantId,
    );
    if (!initial) {
      throw new TablePaymentError(
        'Conta da mesa não encontrada neste restaurante.',
        404,
        'TABLE_ACCOUNT_NOT_FOUND',
      );
    }

    const now = this.now();
    const { data, expiredCount } = await prisma.$transaction(
      async (tx) => {
        await lockTablePaymentSession(tx, restaurantId, initial.id);
        const expiredCount = await expireTablePaymentReservations(
          tx,
          restaurantId,
          initial.id,
          now,
        );

        const refreshed = await tableAccountRepository.findAdminSnapshotData(
          sessionPublicId,
          restaurantId,
          tx,
        );
        if (!refreshed) {
          throw new TablePaymentError(
            'Conta da mesa não encontrada neste restaurante.',
            404,
            'TABLE_ACCOUNT_NOT_FOUND',
          );
        }
        return { data: refreshed, expiredCount };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (expiredCount > 0) {
      await tableAccountEvents.updated({
        sessionId: data.id,
        restaurantId,
        reason: 'PAYMENT_EXPIRED',
        occurredAt: now,
      });
    }

    return {
      ...buildTableAccountBaseSnapshot(data, now),
      paymentIntents: data.paymentIntents.map((payment) =>
        serializeTablePaymentIntentForAdmin(payment, data.publicId),
      ),
    };
  }
}

export default new GetTableAccountAdminSnapshotService();
