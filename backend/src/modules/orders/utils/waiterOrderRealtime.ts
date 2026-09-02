import { OrderType } from '@prisma/client';
import type { RealtimeTransport } from '../../../realtime/realtimePublisher.js';
import { emitAttendantWorkspaceInvalidation } from '../../attendant/realtime/attendantWorkspaceEvents.js';

type AnyOrder = Record<string, any>;

export function buildWaiterOrderRealtimePayload(order: AnyOrder | null | undefined) {
  if (!order || order.type !== OrderType.MESA || !order.table) {
    return null;
  }

  return {
    id: order.id,
    restaurantId: order.restaurantId,
    type: order.type,
    status: order.status,
    total: order.total,
    observation: order.observation || null,
    createdAt: order.createdAt,
    readyAt: order.readyAt || null,
    table: {
      id: order.table.id,
      number: order.table.number,
    },
    customer: order.user?.name ? { id: order.user.id, name: order.user.name } : null,
    items: Array.isArray(order.items)
      ? order.items.map((item: AnyOrder) => ({
          id: item.id,
          quantity: item.quantity,
          observation: item.observation || null,
          ingredients: item.ingredients || null,
          customizations: item.customizations || null,
          product: item.product ? { id: item.product.id, name: item.product.name } : null,
        }))
      : [],
  };
}

export function emitWaiterTableOrderEvent(
  io: Pick<RealtimeTransport, 'to'>,
  event: string,
  order: AnyOrder | null | undefined,
) {
  const payload = buildWaiterOrderRealtimePayload(order);
  if (!payload) return false;

  io.to(`restaurant:${payload.restaurantId}:waiter`).emit(event, payload);
  emitAttendantWorkspaceInvalidation(io, payload.restaurantId, 'ORDERS');
  return true;
}

export function emitTableSessionOrderEvent(
  io: Pick<RealtimeTransport, 'to'>,
  event: string,
  order: AnyOrder | null | undefined,
) {
  const payload = buildWaiterOrderRealtimePayload(order);
  if (!payload) return false;

  io.to(`table:${payload.table.id}`).emit(event, {
    id: payload.id,
    restaurantId: payload.restaurantId,
    type: payload.type,
    status: payload.status,
    createdAt: payload.createdAt,
    readyAt: payload.readyAt,
    table: payload.table,
  });
  return true;
}
