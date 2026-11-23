export type DemoDeliveryClock = { elapsedMs: number; changedAt: number; paused: boolean };
export type DemoOrder = {
  id: string;
  placedAt: number;
  items: { name: string; quantity: number; observation?: string }[];
  total: number;
  method: string;
  destination: string;
  example?: boolean;
  fulfillmentMethod?: 'delivery' | 'pickup';
  deliveryClock?: DemoDeliveryClock;
};

export const prepMs = 6000;
export const routeMs = 48000;
export const deliveredMs = prepMs + routeMs;

export function elapsedTime(order: DemoOrder, now: number) {
  const clock = order.deliveryClock;
  const delta = Math.max(0, now - (clock?.changedAt ?? order.placedAt));
  const elapsed = (clock?.elapsedMs ?? 0) + (clock?.paused ? 0 : delta);
  if (order.fulfillmentMethod === 'pickup' && (clock?.elapsedMs ?? 0) < deliveredMs)
    return Math.min(prepMs, elapsed);
  return Math.min(deliveredMs, elapsed);
}

export function getDemoOrderStatus(
  order: DemoOrder,
  now: number,
): 'PREPARANDO' | 'PRONTO' | 'SAIU_PARA_ENTREGA' | 'ENTREGUE' {
  const elapsed = elapsedTime(order, now);
  if (elapsed < prepMs) return 'PREPARANDO';
  if (elapsed >= deliveredMs) return 'ENTREGUE';
  return order.fulfillmentMethod === 'pickup' ? 'PRONTO' : 'SAIU_PARA_ENTREGA';
}
