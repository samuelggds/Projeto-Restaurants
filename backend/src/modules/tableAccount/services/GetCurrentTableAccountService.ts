import { OrderRefundStatus, OrderStatus, TableBillItemFinancialStatus } from '@prisma/client';
import type {
  TableAccountBaseSnapshotDto,
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
import tableAccountRepository, {
  type TableAccountSnapshotRecord,
} from '../repositories/TableAccountRepository.js';
import tableAccountSettingsRepository from '../repositories/TableAccountSettingsRepository.js';
import { calculateTableBillItemLedger } from '../domain/tablePaymentAllocation.js';

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

export function buildTableAccountBaseSnapshot(
  data: TableAccountSnapshotRecord,
  now = new Date(),
): TableAccountBaseSnapshotDto {
  const paymentIntents = data.paymentIntents || [];
  const normalizedItems = data.billItems.map((item) => {
    const unitPriceCents = toSafeMoneyCents(item.unitPriceCents, `valor do item ${item.publicId}`);
    const orderStatus = operationalStatusMap[item.order.status];
    const financialStatus = resolveFinancialStatus(item);
    const canceled = Boolean(item.canceledAt) || orderStatus === 'CANCELED';
    const paymentAllocations = item.paymentAllocations || [];
    const ledger = calculateTableBillItemLedger({
      unitPriceCents,
      projectedStatus: financialStatus,
      canceled,
      allocations: paymentAllocations.map((allocation) => ({
        amountCents: toSafeMoneyCents(allocation.amountCents, `alocação do item ${item.publicId}`),
        intentStatus: allocation.paymentIntent.status,
        expiresAt: allocation.paymentIntent.expiresAt,
      })),
    });

    return {
      canceled,
      hasAllocations: paymentAllocations.length > 0,
      unitPriceCents,
      financialStatus: ledger.projectedStatus,
      ledger,
      dto: {
        publicId: item.publicId,
        orderPublicId: item.order.publicId,
        productName: item.productName,
        unitIndex: item.unitIndex,
        unitPriceCents,
        paidCents: ledger.paidCents,
        reservedCents: ledger.reservedCents,
        processingCents: ledger.processingCents,
        availableCents: ledger.availableCents,
        financialStatus: ledger.projectedStatus,
        orderStatus,
        orderedByParticipantPublicId: item.participant.publicId,
        orderedByDisplayName: item.participant.displayName?.trim() || 'Cliente da mesa',
      },
    };
  });

  const consumedCents = sumMoneyCents(
    normalizedItems
      .filter((item) => !item.canceled && item.financialStatus !== 'REFUNDED')
      .map((item) => item.unitPriceCents),
  );
  const legacyGrossPaidCents = sumMoneyCents(
    normalizedItems
      .filter((item) => !item.hasAllocations && ['PAID', 'REFUNDED'].includes(item.financialStatus))
      .map((item) => item.unitPriceCents),
  );
  const legacyRefundedCents = sumMoneyCents(
    normalizedItems
      .filter((item) => !item.hasAllocations && item.financialStatus === 'REFUNDED')
      .map((item) => item.unitPriceCents),
  );
  const grossPaidCents = sumMoneyCents([
    legacyGrossPaidCents,
    ...paymentIntents
      .filter((payment) => ['PAID', 'REFUNDED'].includes(payment.status))
      .map((payment) => toSafeMoneyCents(payment.totalCents, `pagamento ${payment.publicId}`)),
  ]);
  const refundedCents = sumMoneyCents([
    legacyRefundedCents,
    ...paymentIntents
      .filter((payment) => payment.status === 'REFUNDED')
      .map((payment) => toSafeMoneyCents(payment.totalCents, `estorno ${payment.publicId}`)),
  ]);
  const serviceFeeCents = sumMoneyCents(
    paymentIntents
      // Uma cobrança totalmente estornada não pode continuar compondo o
      // valor devido da mesa. O histórico permanece em grossPaid/refunded.
      .filter((payment) => payment.status === 'PAID')
      .map((payment) => toSafeMoneyCents(payment.serviceFeeCents, `taxa ${payment.publicId}`)),
  );
  const reservedCents = sumMoneyCents([
    ...normalizedItems.filter((item) => !item.canceled).map((item) => item.ledger.reservedCents),
    ...paymentIntents
      .filter((payment) => payment.status === 'RESERVED' && payment.expiresAt > now)
      .map((payment) =>
        toSafeMoneyCents(payment.serviceFeeCents, `taxa reservada ${payment.publicId}`),
      ),
  ]);
  const processingCents = sumMoneyCents([
    ...normalizedItems.filter((item) => !item.canceled).map((item) => item.ledger.processingCents),
    ...paymentIntents
      .filter((payment) => payment.status === 'PROCESSING' && payment.expiresAt > now)
      .map((payment) =>
        toSafeMoneyCents(payment.serviceFeeCents, `taxa em processamento ${payment.publicId}`),
      ),
  ]);
  const balance = calculateTableAccountBalance({
    consumedCents,
    serviceFeeCents,
    grossPaidCents,
    refundedCents,
  });
  const participantIsActive = (participant: TableAccountSnapshotRecord['participants'][number]) =>
    participant.status === 'ACTIVE' &&
    (participant.userId !== null ||
      participant.tokenExpiresAt === null ||
      participant.tokenExpiresAt > now);

  return {
    contractVersion: TABLE_ACCOUNT_CONTRACT_VERSION,
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
      participantsCount: data.participants.filter(participantIsActive).length,
    },
    participants: data.participants.map((participant) => ({
      publicId: participant.publicId,
      displayName: participant.displayName,
      status: participantIsActive(participant) ? ('ACTIVE' as const) : ('LEFT' as const),
      joinedAt: participant.joinedAt.toISOString(),
      leftAt: participant.leftAt?.toISOString() || null,
    })),
    items: normalizedItems.map((item) => item.dto),
  };
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

    const [data, settings] = await Promise.all([
      tableAccountRepository.findSnapshotData(tableSessionId, restaurantId, participantId),
      tableAccountSettingsRepository.findByRestaurantId(restaurantId),
    ]);
    if (!data) {
      throw new TableAccountAccessError();
    }
    const now = new Date();
    const paymentIntents = data.paymentIntents || [];
    // Nesta etapa o único adapter disponível é o simulador local, que se
    // desativa em produção. Não ofereça Pix/cartão online ao cliente quando
    // não existe um provedor real capaz de criar e confirmar a cobrança.
    const onlinePaymentProviderAvailable = process.env.NODE_ENV !== 'production';

    return {
      ...buildTableAccountBaseSnapshot(data, now),
      currentParticipantPublicId: input.participantPublicId,
      capabilities: {
        enabled: settings.enabled,
        allowCash: settings.allowCash,
        allowCardMachine: settings.allowCardMachine,
        allowOnlinePayment: settings.allowOnlinePayment && onlinePaymentProviderAvailable,
        allowSplit: settings.allowSplit,
        serviceFeeMode: settings.serviceFeeMode,
        serviceFeeBasisPoints: settings.serviceFeeBasisPoints,
        reservationTimeoutMinutes: settings.reservationTimeoutMinutes,
      },
      payments: paymentIntents.map((payment) => ({
        publicId: payment.publicId,
        payerParticipantPublicId: payment.payerParticipant.publicId,
        selectionMode: payment.selectionMode,
        status:
          ['RESERVED', 'PROCESSING'].includes(payment.status) && payment.expiresAt <= now
            ? ('EXPIRED' as const)
            : payment.status,
        totalCents: toSafeMoneyCents(payment.totalCents, `pagamento ${payment.publicId}`),
        createdAt: payment.createdAt.toISOString(),
      })),
    };
  }
}

export default new GetCurrentTableAccountService();
