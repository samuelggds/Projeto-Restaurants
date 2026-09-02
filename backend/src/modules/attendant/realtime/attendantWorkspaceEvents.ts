import { realtimePublisher, type RealtimeTransport } from '../../../realtime/realtimePublisher.js';

export type AttendantWorkspaceResource = 'ORDERS' | 'CALLS' | 'TABLES';

export function emitAttendantWorkspaceInvalidation(
  transport: Pick<RealtimeTransport, 'to'>,
  restaurantId: number,
  resource: AttendantWorkspaceResource,
) {
  const normalizedRestaurantId = Number(restaurantId);
  if (!Number.isSafeInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
    return false;
  }

  transport
    .to(`restaurant:${normalizedRestaurantId}:attendant`)
    .emit('attendant:workspace-invalidated', { resource });
  return true;
}

export const attendantWorkspaceEvents = {
  invalidated(restaurantId: number, resource: AttendantWorkspaceResource) {
    return emitAttendantWorkspaceInvalidation(realtimePublisher, restaurantId, resource);
  },
};
