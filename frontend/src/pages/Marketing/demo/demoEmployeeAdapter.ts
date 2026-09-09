import { demoTableAccount } from './demoTableAccount';
import type { DemoState } from './demoDomain';
import type { WaiterAccountSession } from '../../waiter/types';
const time = (value: string) =>
  new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const sessionId = (tableId: string) => `demo-session:${tableId}`;
export function demoOperationalOrders(state: DemoState) {
  return state.orders.map((order) => ({
    id: String(order.id),
    channel: order.channel,
    status: order.status,
    reference:
      order.channel === 'TABLE'
        ? `Mesa ${String(order.tableNumber).padStart(2, '0')}`
        : order.channel === 'PICKUP'
          ? 'Retirada'
          : 'Delivery',
    customer: order.customerName,
    items: order.items.map((item) => `${item.quantity}x ${item.name}`),
    itemDetails: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      customizations: [],
    })),
    createdAt: time(order.createdAt),
    createdAtIso: order.createdAt,
    preparationStartedAt: order.preparationStartedAt,
    readyAt: order.readyAt,
    completedAtIso: order.deliveredAt,
    elapsed: `${Math.max(0, Math.floor((Date.now() - Date.parse(order.createdAt)) / 60000))} min`,
    total: order.total,
  }));
}

export function demoWaiterAccounts(state: DemoState): WaiterAccountSession[] {
  return state.tables
    .filter(
      (table) =>
        table.occupied ||
        state.orders.some(
          (order) =>
            order.channel === 'TABLE' &&
            order.tableNumber === table.number &&
            !order.paid &&
            order.status !== 'CANCELADO',
        ),
    )
    .map((table) => {
      const orders = state.orders.filter(
        (order) =>
          order.channel === 'TABLE' &&
          order.tableNumber === table.number &&
          order.status !== 'CANCELADO',
      );
      const consumedCents = Math.round(
        orders.reduce((total, order) => total + order.total, 0) * 100,
      );
      const financial = demoTableAccount(state, table.number);
      const netPaidCents = financial.summary.netPaidCents;
      const reservedPayments = (state.tablePayments ?? []).filter(
        (entry) =>
          entry.payment.sessionPublicId === financial.summary.sessionPublicId &&
          entry.payment.status === 'RESERVED',
      );
      const allocatedOrderIds = new Set(
        (state.tablePayments ?? [])
          .filter(
            (entry) =>
              entry.payment.sessionPublicId === financial.summary.sessionPublicId &&
              ['RESERVED', 'PAID'].includes(entry.payment.status),
          )
          .flatMap((entry) => Object.keys(entry.allocations).map((id) => Number(id.split(':')[1]))),
      );
      return {
        tableSessionId: sessionId(table.id),
        sessionPublicId: sessionId(table.id),
        tableId: table.id,
        tableNumber: table.number,
        openedAt: orders.at(-1)?.createdAt ?? new Date().toISOString(),
        status: table.closingRequested ? 'CLOSING_REQUESTED' : 'OPEN',
        openedByName: 'Garçom Demo',
        summary: {
          consumedCents,
          netPaidCents,
          reservedCents: financial.summary.reservedCents,
          processingCents: 0,
          remainingCents: Math.max(0, consumedCents - netPaidCents),
          participantsCount: table.guests || 1,
        },
        itemsCount: orders.reduce(
          (total, order) => total + order.items.reduce((sum, item) => sum + item.quantity, 0),
          0,
        ),
        paymentCounts: {
          reserved: orders.filter((order) => !order.paid).length,
          processing: 0,
          online: orders.filter((order) => order.paid && order.paymentMethod !== 'CASH').length,
          inPerson: orders.filter((order) => order.paymentMethod === 'CASH').length,
        },
        pendingManualPayments: [
          ...reservedPayments.map(({ payment }) => ({
            publicId: payment.publicId,
            method:
              payment.method === 'CARD_MACHINE' ? ('CARD_MACHINE' as const) : ('CASH' as const),
            status: 'RESERVED' as const,
            totalCents: payment.totalCents,
            createdAt: payment.createdAt,
          })),
          ...orders
            .filter((order) => !order.paid && !allocatedOrderIds.has(order.id))
            .map((order) => ({
              publicId: `demo-payment:${order.id}`,
              method: 'CASH' as const,
              status: 'RESERVED' as const,
              totalCents: Math.round(order.total * 100),
              createdAt: order.createdAt,
            })),
        ],
      };
    });
}
