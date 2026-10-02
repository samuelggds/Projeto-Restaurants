import type { TableAccountActor } from '../domain/tableAccountContracts.js';
import {
  canViewTableAccountFinancialHistory,
  isManualTablePaymentIntent,
} from '../domain/tableAccountRules.js';
import tableAccountRepository from '../repositories/TableAccountRepository.js';
import {
  buildTableAccountBaseSnapshot,
  toSafeMoneyCents,
} from './GetCurrentTableAccountService.js';
import { hasStaffCashReceiptEvent } from './tablePaymentLedger.js';
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

    const now = new Date();
    const sessions = await tableAccountRepository.listAdminSnapshotDataByRestaurant(
      restaurantId,
      now,
    );
    const snapshots = sessions.map((data) => {
      const account = buildTableAccountBaseSnapshot(data, now);
      const pendingManualPayments = data.paymentIntents
        .map((payment) => ({
          payment,
          staffReceiptRegistered: hasStaffCashReceiptEvent(payment.events),
        }))
        .filter(
          ({ payment, staffReceiptRegistered }) =>
            payment.method === 'CASH' &&
            ['RESERVED', 'PROCESSING'].includes(payment.status) &&
            (payment.expiresAt > now || staffReceiptRegistered) &&
            isManualTablePaymentIntent(payment),
        )
        .map(({ payment, staffReceiptRegistered }) => {
          const payer = account.participants.find(
            (participant) => participant.publicId === payment.payerParticipant.publicId,
          );
          return {
            publicId: payment.publicId,
            method: payment.method,
            status: payment.status,
            totalCents: toSafeMoneyCents(
              payment.totalCents,
              `pagamento presencial ${payment.publicId}`,
            ),
            createdAt: payment.createdAt.toISOString(),
            payerParticipantPublicId: payment.payerParticipant.publicId,
            payerDisplayName: payer?.displayName || 'Cliente da mesa',
            staffReceiptRegistered,
          };
        });
      return {
            publicId: payment.publicId,
            method: payment.method,
            status: payment.status,
            totalCents: toSafeMoneyCents(
              payment.totalCents,
              `pagamento presencial ${payment.publicId}`,
            ),
            createdAt: payment.createdAt.toISOString(),
            payerParticipantPublicId: payment.payerParticipant.publicId,
            payerDisplayName: payer?.displayName || 'Cliente da mesa',
            staffReceiptRegistered,
          };
        });
      return {
        tableSessionId: data.id,
        sessionPublicId: data.publicId,
        tableId: data.tableId,
        tableNumber: data.table.number,
        openedAt: data.openedAt.toISOString(),
        status: data.status,
        openedByName: data.openedBy.name,
        summary: account.summary,
        participants: account.participants,
        itemsCount: account.items.length,
        pendingManualPayments,
        paymentCounts: {
          reserved: data.paymentIntents.filter((payment) => payment.status === 'RESERVED').length,
          processing: data.paymentIntents.filter((payment) => payment.status === 'PROCESSING')
            .length,
          online: data.paymentIntents.filter((payment) => Boolean(payment.provider)).length,
          inPerson: data.paymentIntents.filter((payment) => payment.method === 'CASH').length,
        },
      };
    });

    return { sessions: snapshots };
  }
}

export default new ListTableAccountAdminSessionsService();
