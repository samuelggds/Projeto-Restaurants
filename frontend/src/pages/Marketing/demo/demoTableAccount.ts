import type {
  TableAccountSnapshot,
  TablePaymentDraft,
  TablePaymentIntent,
} from '../../Home/domain/tableAccount';
import type { DemoState } from './demoDomain';

export type DemoTablePayment = { payment: TablePaymentIntent; allocations: Record<string, number> };
export const demoParticipant = 'demo-cliente';

export function demoTableAccount(state: DemoState, tableNumber = 8): TableAccountSnapshot {
  const table = state.tables.find((item) => item.number === tableNumber);
  const orders = state.orders.filter(
    (order) =>
      order.channel === 'TABLE' &&
      order.tableNumber === tableNumber &&
      order.status !== 'CANCELADO',
  );
  const sessionPublicId = `demo-session:${table?.id ?? `table-${tableNumber}`}`;
  const payments = (state.tablePayments ?? []).filter(
    (entry) => entry.payment.sessionPublicId === sessionPublicId,
  );
  const items: TableAccountSnapshot['items'] = orders.flatMap((order) =>
    order.items.flatMap((line, lineIndex) =>
      Array.from({ length: line.quantity }, (_, unitIndex) => {
        const publicId = `demo-item:${order.id}:${lineIndex}:${unitIndex}`;
        const unitPriceCents = Math.round(line.unitPrice * 100);
        const credited = payments
          .filter((entry) => entry.payment.status === 'PAID')
          .reduce((sum, entry) => sum + (entry.allocations[publicId] ?? 0), 0);
        const paidCents = order.paid ? unitPriceCents : Math.min(unitPriceCents, credited);
        const reservedCents = Math.min(
          unitPriceCents - paidCents,
          payments
            .filter((entry) => ['RESERVED', 'PROCESSING'].includes(entry.payment.status))
            .reduce((sum, entry) => sum + (entry.allocations[publicId] ?? 0), 0),
        );
        const owner =
          order.customerEmail === 'cliente@demo.gastronexa.com.br'
            ? demoParticipant
            : order.customerEmail;
        return {
          publicId,
          orderPublicId: order.publicId,
          productName: line.name,
          unitIndex,
          unitPriceCents,
          paidCents,
          reservedCents,
          processingCents: 0,
          availableCents: Math.max(0, unitPriceCents - paidCents - reservedCents),
          financialStatus:
            paidCents === unitPriceCents ? 'PAID' : reservedCents ? 'RESERVED' : 'UNPAID',
          orderStatus: (
            {
              PENDENTE: 'PENDING',
              PREPARANDO: 'PREPARING',
              PRONTO: 'READY',
              ENTREGUE: 'DELIVERED',
              CANCELADO: 'CANCELED',
              SAIU_PARA_ENTREGA: 'READY',
            } as const
          )[order.status],
          orderedByParticipantPublicId: owner,
          orderedByDisplayName: order.customerName,
        };
      }),
    ),
  );
  const participants: TableAccountSnapshot['participants'] = [
    ...new Set([demoParticipant, ...items.map((item) => item.orderedByParticipantPublicId)]),
  ].map((id) => ({
    publicId: id,
    displayName:
      id === demoParticipant
        ? 'Cliente Demo'
        : (items.find((item) => item.orderedByParticipantPublicId === id)?.orderedByDisplayName ??
          'Cliente da mesa'),
    status: 'ACTIVE',
    joinedAt: orders.at(-1)?.createdAt ?? state.accounts[0].createdAt,
    leftAt: null,
  }));
  const consumedCents = items.reduce((sum, item) => sum + item.unitPriceCents, 0);
  const netPaidCents = items.reduce((sum, item) => sum + item.paidCents, 0);
  const reservedCents = items.reduce((sum, item) => sum + item.reservedCents, 0);
  return {
    contractVersion: 1,
    currentParticipantPublicId: demoParticipant,
    capabilities: {
      enabled: true,
      allowCash: true,
      allowCardMachine: true,
      allowOnlinePayment: true,
      allowSplit: true,
      serviceFeeMode: 'DISABLED',
      serviceFeeBasisPoints: 0,
      reservationTimeoutMinutes: 10,
    },
    summary: {
      sessionPublicId,
      tableNumber,
      status: !table?.occupied ? 'CLOSED' : table.closingRequested ? 'CLOSING_REQUESTED' : 'OPEN',
      consumedCents,
      serviceFeeCents: 0,
      grossPaidCents: netPaidCents,
      refundedCents: 0,
      netPaidCents,
      reservedCents,
      processingCents: 0,
      remainingCents: consumedCents - netPaidCents,
      overpaidCents: 0,
      participantsCount: participants.length,
    },
    participants,
    items,
    activePayment:
      payments.find((entry) => ['RESERVED', 'PROCESSING'].includes(entry.payment.status))
        ?.payment ?? null,
    payments: payments.map(({ payment }) => ({ ...payment })),
  };
}

function updatePaidOrders(state: DemoState): DemoState {
  const snapshot = demoTableAccount(state);
  return {
    ...state,
    orders: state.orders.map((order) => {
      if (order.channel !== 'TABLE' || order.tableNumber !== 8 || order.status === 'CANCELADO')
        return order;
      const items = snapshot.items.filter((item) => item.orderPublicId === order.publicId);
      return items.length && items.every((item) => item.paidCents >= item.unitPriceCents)
        ? { ...order, paid: true }
        : order;
    }),
  };
}

export function createDemoTablePayment(
  state: DemoState,
  draft: TablePaymentDraft,
  now = Date.now(),
) {
  const snapshot = demoTableAccount(state);
  if (snapshot.summary.status === 'CLOSED') throw new Error('A mesa está fechada.');
  let items = snapshot.items.filter((item) => item.availableCents > 0);
  if (draft.selectionMode === 'MY_ITEMS')
    items = items.filter((item) => item.orderedByParticipantPublicId === demoParticipant);
  if (draft.selectionMode === 'SELECTED_ITEMS')
    items = items.filter((item) => draft.billItemPublicIds?.includes(item.publicId));
  let totalCents = items.reduce((sum, item) => sum + item.availableCents, 0);
  if (draft.selectionMode === 'EQUAL_SPLIT') {
    if (!Number.isInteger(draft.splitCount) || draft.splitCount! < 2 || draft.splitCount! > 100)
      throw new Error('Informe uma divisão válida.');
    totalCents = Math.ceil(totalCents / draft.splitCount!);
  }
  if (totalCents <= 0) throw new Error('Não há saldo disponível nessa seleção.');
  const allocations: Record<string, number> = {};
  let remaining = totalCents;
  for (const item of items) {
    const value = Math.min(remaining, item.availableCents);
    if (value > 0) allocations[item.publicId] = value;
    remaining -= value;
  }
  const createdAt = new Date(now).toISOString();
  const payment: TablePaymentIntent = {
    publicId: `demo-table-payment:${now}:${(state.tablePayments?.length ?? 0) + 1}`,
    sessionPublicId: snapshot.summary.sessionPublicId,
    payerParticipantPublicId: demoParticipant,
    selectionMode: draft.selectionMode,
    method: draft.method,
    status: ['CASH', 'CARD_MACHINE'].includes(draft.method) ? 'RESERVED' : 'PAID',
    billItemPublicIds: Object.keys(allocations),
    subtotalCents: totalCents,
    serviceFeeCents: 0,
    totalCents,
    provider: 'DEMO',
    externalId: null,
    checkoutUrl: null,
    paymentCode: null,
    expiresAt: new Date(now + 600000).toISOString(),
    createdAt,
    updatedAt: createdAt,
  };
  const next = updatePaidOrders({
    ...state,
    tablePayments: [...(state.tablePayments ?? []), { payment, allocations }],
  });
  return { state: next, payment };
}

export function confirmDemoTablePayment(state: DemoState, id: string): DemoState {
  const entry = state.tablePayments?.find((item) => item.payment.publicId === id);
  if (!entry || entry.payment.status !== 'RESERVED')
    throw new Error('Pagamento indisponível para confirmação.');
  return updatePaidOrders({
    ...state,
    tablePayments: state.tablePayments!.map((item) =>
      item === entry ? { ...item, payment: { ...item.payment, status: 'PAID' } } : item,
    ),
  });
}

export function cancelDemoTablePayment(state: DemoState, id: string): DemoState {
  return {
    ...state,
    tablePayments: state.tablePayments?.map((entry) =>
      entry.payment.publicId === id && entry.payment.status === 'RESERVED'
        ? { ...entry, payment: { ...entry.payment, status: 'CANCELED' } }
        : entry,
    ),
  };
}
