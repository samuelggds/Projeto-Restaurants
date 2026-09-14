import type {
  CourierConfiguration,
  CourierSettlement,
  PendingCourierOrder,
} from '../../../Services/courierCompensationService';
import type { DemoOperationContext } from './demoAdminLocalOperations';

export function demoCourierPayments(
  ctx: DemoOperationContext,
  configuration: CourierConfiguration,
): { data: unknown } | undefined {
  const { path, method, body, state, records, nextId, query } = ctx;
  if (!path.startsWith('/courier-compensation/')) return;
  const settlements = (records.get('courier-settlements') as CourierSettlement[] | undefined) ?? [];
  const courier =
    configuration.couriers.find(
      (item) => item.id === Number(body.courierId ?? query.courierId ?? 6),
    ) ?? configuration.couriers[0];
  if (!courier) throw new Error('Cadastre um motoqueiro na demonstração.');
  const policy = courier.override ?? configuration.defaultPolicy;
  const distance = 2000; // The demo route is a fictitious 2 km trip.
  const fee =
    policy.model === 'DISTANCE_RANGES'
      ? ([...policy.ranges]
          .sort((a, b) => a.maxDistanceMeters - b.maxDistanceMeters)
          .find((range) => range.maxDistanceMeters >= distance)?.amount ?? 0)
      : policy.model === 'BASE_PLUS_DISTANCE'
        ? policy.baseAmount +
          (Math.max(0, distance - policy.includedDistanceMeters) / 1000) * policy.extraPerKmAmount
        : policy.fixedAmount;
  const settled = new Set(
    settlements
      .filter((item) => item.status !== 'CANCELED')
      .flatMap((item) => item.items.map((entry) => entry.orderId)),
  );
  const pending: PendingCourierOrder[] = state.orders
    .filter(
      (order) =>
        order.channel === 'DELIVERY' && order.status === 'ENTREGUE' && !settled.has(order.id),
    )
    .map((order) => ({
      id: order.id,
      publicId: order.publicId,
      assignedCourierId: courier.id,
      courierEarning: Math.round(fee * 100) / 100,
      cashCollectedAmount: order.paymentMethod === 'CASH' ? order.total : 0,
      total: order.total,
      deliveredAt: order.deliveredAt ?? order.createdAt,
      district: 'Bairro Demo',
      city: 'Cidade fictícia',
      assignedCourier: { id: courier.id, name: courier.name },
    }));
  if (path.endsWith('/pending-orders')) return { data: pending };
  if (path.endsWith('/settlements')) {
    if (method === 'GET') return { data: settlements };
    const selected = pending.filter((order) =>
      ((body.orderIds as number[]) ?? []).includes(order.id),
    );
    if (!selected.length) throw new Error('Selecione entregas concluídas ainda não acertadas.');
    const gross = selected.reduce((sum, order) => sum + order.courierEarning, 0);
    const cash = selected.reduce((sum, order) => sum + order.cashCollectedAmount, 0);
    const net = Math.round((gross - cash) * 100) / 100;
    const settlement: CourierSettlement = {
      publicId: `demo-courier-settlement-${nextId()}`,
      status: 'AWAITING_COURIER_CONFIRMATION',
      grossCourierEarnings: gross,
      cashCollectedAmount: cash,
      netAmount: Math.abs(net),
      direction:
        net > 0 ? 'RESTAURANT_PAYS_COURIER' : net < 0 ? 'COURIER_RETURNS_CASH' : 'BALANCED',
      createdAt: new Date().toISOString(),
      courier,
      items: selected.map((order) => ({ orderId: order.id })),
    };
    records.set('courier-settlements', [...settlements, settlement]);
    return { data: settlement };
  }
  const action = path.match(/\/settlements\/([^/]+)\/(cancel|confirm|dispute)$/);
  if (action) {
    const current = settlements.find((item) => item.publicId === action[1]);
    if (!current) throw new Error('Acerto fictício não encontrado.');
    const updated: CourierSettlement = {
      ...current,
      status:
        action[2] === 'cancel' ? 'CANCELED' : action[2] === 'confirm' ? 'CONFIRMED' : 'DISPUTED',
      disputeReason: action[2] === 'dispute' ? String(body.reason ?? '') : null,
    };
    records.set(
      'courier-settlements',
      settlements.map((item) => (item === current ? updated : item)),
    );
    return { data: updated };
  }
}
