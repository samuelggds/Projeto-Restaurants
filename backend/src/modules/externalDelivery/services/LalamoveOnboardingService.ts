import { withTenantDbContext } from '../../../database/tenantDbContext.js';

const PROVIDER = 'LALAMOVE' as const;

type OnboardingStatus = 'NOT_REQUESTED' | 'REQUESTED' | 'IN_REVIEW' | 'ACTION_REQUIRED' | 'SUSPENDED';

type OnboardingRow = {
  status: string;
  requestedAt: Date;
  updatedAt: Date;
};

function positiveId(value: unknown, label: string): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0 || number > 2147483647) {
    throw new Error(label + ' inválido.');
  }
  return number;
}

function overview(row: OnboardingRow | null) {
  const accepted: OnboardingStatus[] = [
    'REQUESTED',
    'IN_REVIEW',
    'ACTION_REQUIRED',
    'SUSPENDED',
  ];
  const status: OnboardingStatus = row && accepted.includes(row.status as OnboardingStatus)
    ? (row.status as OnboardingStatus)
    : 'NOT_REQUESTED';

  return {
    provider: PROVIDER,
    status,
    connected: false,
    canDispatch: false,
    requestedAt: row?.requestedAt.toISOString() ?? null,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

class LalamoveOnboardingService {
  async getStatus(restaurantIdInput: unknown) {
    const restaurantId = positiveId(restaurantIdInput, 'Restaurante');
    return withTenantDbContext(restaurantId, async (tx) => {
      const row = await tx.restaurantExternalDeliveryOnboarding.findUnique({
        where: { restaurantId_provider: { restaurantId, provider: PROVIDER } },
        select: { status: true, requestedAt: true, updatedAt: true },
      });
      return overview(row);
    });
  }

  async requestConnection(restaurantIdInput: unknown, requestedByInput: unknown) {
    const restaurantId = positiveId(restaurantIdInput, 'Restaurante');
    const requestedByUserId = positiveId(requestedByInput, 'Administrador');
    return withTenantDbContext(restaurantId, async (tx) => {
      // ON CONFLICT DO NOTHING makes repeated and concurrent requests idempotent.
      // Neither the restaurant nor the endpoint may set connection status.
      await tx.restaurantExternalDeliveryOnboarding.createMany({
        data: [{
          restaurantId,
          provider: PROVIDER,
          status: 'REQUESTED',
          requestedByUserId,
        }],
        skipDuplicates: true,
      });
      const row = await tx.restaurantExternalDeliveryOnboarding.findUniqueOrThrow({
        where: { restaurantId_provider: { restaurantId, provider: PROVIDER } },
        select: { status: true, requestedAt: true, updatedAt: true },
      });
      return overview(row);
    });
  }
}

export default new LalamoveOnboardingService();
