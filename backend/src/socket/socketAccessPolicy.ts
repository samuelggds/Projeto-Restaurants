import {
  isPlatformMaintenanceError,
  platformMaintenanceAccessService,
} from '../modules/platform/services/PlatformMaintenanceService.js';
import restaurantAccessService from '../modules/billing/services/RestaurantAccessService.js';

export class SocketAccessDeniedError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'SocketAccessDeniedError';
  }
}

export async function assertSocketAccess(
  role: string | null | undefined,
  restaurantIdValue: number | string | null | undefined,
) {
  try {
    await platformMaintenanceAccessService.assertRoleAllowed(role);
  } catch (error) {
    if (isPlatformMaintenanceError(error)) {
      throw new SocketAccessDeniedError(error.code);
    }
    throw error;
  }

  if (String(role || '').toUpperCase() === 'SUPER_ADMIN') return;

  const restaurantId = Number(restaurantIdValue || 0);
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) return;

  const decision = await restaurantAccessService.evaluate(restaurantId);
  if (decision && 'code' in decision) {
    throw new SocketAccessDeniedError(decision.code);
  }
}
