import { OrderRequestError } from '../domain/OrderRequestError.js';
export function assertOrderCapacity(activeOrders: number, configuredLimit: unknown) {
  const limit = Math.min(500, Math.max(1, Number(configuredLimit) || 20));
  if (activeOrders >= limit) {
    throw new OrderRequestError(
      'O restaurante atingiu o limite de pedidos em andamento. Tente novamente em alguns minutos.',
    );
  }
  return limit;
}
