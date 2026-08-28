import { isTechnicalMaintenancePath } from '../Services/platformMaintenance';
import type { SystemBlockState } from '../Services/systemBlock';

export type AvailabilityView =
  'APP' | 'LOADING' | 'PLATFORM_MAINTENANCE' | 'TENANT_MAINTENANCE' | 'BILLING_ADMIN';

export function resolveAvailabilityView(input: {
  pathname: string;
  role?: unknown;
  userPresent: boolean;
  platformMaintenance: boolean;
  initialStatusPending: boolean;
  systemBlock: Pick<SystemBlockState, 'reason'> | null;
}): AvailabilityView {
  const role = String(input.role || '').toUpperCase();
  const superAdmin = role === 'SUPER_ADMIN';

  if (isTechnicalMaintenancePath(input.pathname)) return 'APP';
  if (input.platformMaintenance && !superAdmin) return 'PLATFORM_MAINTENANCE';
  if (input.initialStatusPending && !superAdmin) return 'LOADING';
  if (!input.systemBlock || superAdmin) return 'APP';

  if (!input.userPresent && input.pathname === '/login') return 'APP';
  if (role === 'ADMIN' && input.systemBlock.reason === 'BILLING') return 'BILLING_ADMIN';
  return 'TENANT_MAINTENANCE';
}
