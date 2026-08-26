import {
  OrderRefundStatus,
  OrderStatus,
  TableBillItemFinancialStatus,
} from '@prisma/client';
import type {
  TableAccountSnapshotDto,
  TableBillItemFinancialStatus as TableBillItemFinancialStatusDto,
  TableOrderOperationalStatus,
} from '../domain/tableAccountContracts.js';
import { TABLE_ACCOUNT_CONTRACT_VERSION } from '../domain/tableAccountContracts.js';
import {
  assertMoneyCents,
  calculateTableAccountBalance,
  sumMoneyCents,
} from '../domain/tableAccountRules.js';
import tableAccountRepository from '../repositories/TableAccountRepository.js';

const operationalStatusMap: Record<OrderStatus, TableOrderOperationalStatus> = {
  [OrderStatus.PENDENTE]: 'PENDING',
  [OrderStatus.PREPARANDO]: 'PREPARING',
  [OrderStatus.PRONTO]: 'READY',
  [OrderStatus.SAIU_PARA_ENTREGA]: 'READY',
  [OrderStatus.ENTREGUE]: 'DELIVERED',
  [OrderStatus.CANCELADO]: 'CANCELED',
};

function toSafeMoneyCents(value: bigint, fieldName: string) {
  return assertMoneyCents(Number(value), fieldName);
}

function resolveFinancialStatus(item: {
  financialStatus: TableBillItemFinancialStatus;
  order: { paid: boolean; refundStatus: OrderRefundStatus };
}): TableBillItemFinancialStatusDto {
  if (item.order.refundStatus === OrderRefundStatus.SUCCEEDED) {
    return 'REFUNDED';
  }
  if (item.order.paid) {
    return 'PAID';
  }
  return item.financialStatus;
}

export class TableAccountAccessError extends Error {
  constructor(message = 'Conta da mesa não encontrada.') {
    super(message);
    this.name = 'TableAccountAccessError';
  }
}

export class GetCurrentTableAccountService {
  async execute(input: {
    tableSessionId: number;
    restaurantId: number;
    participantId: number;
    participantPublicId: string;
  }): Promise<TableAccountSnapshotDto> {
    const tableSessionId = Number(input.tableSessionId);
    const restaurantId = Number(input.restaurantId);
    const participantId = Number(input.participantId);
    if (
      !Number.isSafeInteger(tableSessionId) ||
      tableSessionId <= 0 ||
      !Number.isSafeInteger(restaurantId) ||
      restaurantId <= 0 ||
      !Number.isSafeInteger(participantId) ||
      participantId <= 0
    ) {
      throw new TableAccountAccessError();
    }

    const data = await tableAccountRepository.findSnapshotData(
      tableSessionId,
      restaurantId,
      participantId,
    );
    if (!data) {
      throw new TableAccountAccessError();
    }

    const normalizedItems = data.billItems.map((item) => {
      const unitPriceCents = toSafeMoneyCents(
        item.unitPriceCents,
        `valor do item ${item.publicId}`,
      );
      const orderStatus = operationalStatusMap[item.order.status];
      const financialStatus = resolveFinancialStatus(item);
      const canceled = Boolean(item.canceledAt) || orderStatus === 'CANCELED';

      return {
        canceled,
        unitPriceCents,
        financialStatus,
        dto: {
          publicId: item.publicId,
          orderPublicId: item.order.publicId,
          productName: item.productName,
          unitIndex: item.unitIndex,
          unitPriceCents,
          financialStatus,
          orderStatus,
          orderedByParticipantPublicId: item.participant.publicId,
          orderedByDisplayName: item.participant.displayName?.trim() || 'Cliente da mesa',
        },
      };
    });

    const consumedCents = sumMoneyCents(
      normalizedItems.filter((item) => !item.canceled).map((item) => item.unitPriceCents),
    );
    const grossPaidCents = sumMoneyCents(
      normalizedItems
        .filter((item) => ['PAID', 'REFUNDED'].includes(item.financialStatus))
        .map((item) => item.unitPriceCents),
    );
    const refundedCents = sumMoneyCents(
      normalizedItems
        .filter((item) => item.financialStatus === 'REFUNDED')
        .map((item) => item.unitPriceCents),
    );
    const reservedCents = sumMoneyCents(
      normalizedItems
        .filter((item) => !item.canceled && item.financialStatus === 'RESERVED')
        .map((item) => item.unitPriceCents),
    );
    const processingCents = sumMoneyCents(
      normalizedItems
        .filter((item) => !item.canceled && item.financialStatus === 'PROCESSING')
        .map((item) => item.unitPriceCents),
    );
    const serviceFeeCents = 0;
    const balance = calculateTableAccountBalance({
      consumedCents,
      serviceFeeCents,
      grossPaidCents,
      refundedCents,
    });

    return {
      contractVersion: TABLE_ACCOUNT_CONTRACT_VERSION,
      currentParticipantPublicId: input.participantPublicId,
      summary: {
        sessionPublicId: data.publicId,
        tableNumber: data.table.number,
        status: data.status,
        consumedCents,
        serviceFeeCents,
        grossPaidCents,
        refundedCents,
        netPaidCents: balance.netPaidCents,
        reservedCents,
        processingCents,
        remainingCents: balance.remainingCents,
        overpaidCents: balance.overpaidCents,
        participantsCount: data.participants.filter((participant) => participant.status === 'ACTIVE')
          .length,
      },
      participants: data.participants.map((participant) => ({
        publicId: participant.publicId,
        displayName: participant.displayName,
        status: participant.status,
        joinedAt: participant.joinedAt.toISOString(),
        leftAt: participant.leftAt?.toISOString() || null,
      })),
      items: normalizedItems.map((item) => item.dto),
      payments: [],
    };
  }
}

export default new GetCurrentTableAccountService();
