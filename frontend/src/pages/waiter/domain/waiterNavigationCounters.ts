import type { Order, ServiceCall, WaiterAccountSession } from '../types';

/**
 * Counts actionable items in the current restaurant's authenticated workspace.
 * Ready TABLE orders leave the badge only after delivery; calls remain active
 * through IN_PROGRESS and leave after RESOLVED.
 */
export function waiterNavigationCounters({
  orders, calls, accounts,
}: {
  orders: Order[];
  calls: ServiceCall[];
  accounts: WaiterAccountSession[];
}) {
  const readyOrders = new Set(orders.filter(
    (order) => order.channel === 'TABLE' && order.status === 'PRONTO',
  ).map((order) => order.id));
  const activeCalls = new Set(calls.filter(
    (call) => call.status === 'WAITING' || call.status === 'IN_PROGRESS',
  ).map((call) => call.id));
  const pendingPayments = new Set(accounts.flatMap(
    (account) => account.pendingManualPayments.map((payment) => payment.publicId),
  ));
  return {
    readyOrders: readyOrders.size,
    activeCalls: activeCalls.size,
    pendingPayments: pendingPayments.size,
  };
}

export function badgeDisplayCount(count: number) {
  return count > 99 ? '99+' : String(Math.max(0, count));
}
