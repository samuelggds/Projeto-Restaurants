import type { TableAccountActor } from '../domain/tableAccountContracts.js';
import { canViewTableAccountFinancialHistory } from '../domain/tableAccountRules.js';
import tableAccountRepository from '../repositories/TableAccountRepository.js';
import tableSessionRepository from '../../tableSession/repositories/TableSessionRepository.js';
import { buildTableAccountBaseSnapshot } from './GetCurrentTableAccountService.js';
import { TablePaymentError } from './tablePaymentSupport.js';

export class ListTableAccountAdminSessionsService {
  async execute(actor: TableAccountActor) {
    const restaurantId = Number(actor.restaurantId || 0);
    if (!canViewTableAccountFinancialHistory(actor, restaurantId)) {
      throw new TablePaymentError(
        'Somente o administrador ou um garçom deste restaurante pode consultar as contas.',
        403,
        'TABLE_ACCOUNT_HISTORY_FORBIDDEN',
      );
    }

    const sessions = await tableSessionRepository.listOpenByRestaurant(restaurantId);
    const now = new Date();
    const snapshots = await Promise.all(
      sessions.map(async (session) => {
        const data = await tableAccountRepository.findAdminSnapshotData(
          session.publicId,
          restaurantId,
        );
        if (!data) return null;
        const account = buildTableAccountBaseSnapshot(data, now);
        return {
          tableSessionId: session.id,
          sessionPublicId: session.publicId,
          tableId: session.tableId,
          tableNumber: session.table.number,
          openedAt: session.openedAt.toISOString(),
          status: session.status,
          openedByName: session.openedBy.name,
          summary: account.summary,
          participants: account.participants,
          itemsCount: account.items.length,
          paymentCounts: {
            reserved: data.paymentIntents.filter((payment) => payment.status === 'RESERVED').length,
            processing: data.paymentIntents.filter((payment) => payment.status === 'PROCESSING')
              .length,
            online: data.paymentIntents.filter((payment) => Boolean(payment.provider)).length,
            inPerson: data.paymentIntents.filter((payment) =>
              ['CASH', 'CARD_MACHINE'].includes(payment.method),
            ).length,
          },
        };
      }),
    );

    return { sessions: snapshots.filter((session) => session !== null) };
  }
}

export default new ListTableAccountAdminSessionsService();
