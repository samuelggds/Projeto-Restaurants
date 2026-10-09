import { withTenantDbContext } from '../../../database/tenantDbContext.js';

const PROVIDER = 'LALAMOVE' as const;

type OnboardingStatus = 'NOT_REQUESTED' | 'REQUESTED' | 'IN_REVIEW' | 'ACTION_REQUIRED' | 'SUSPENDED';

type OnboardingRow = {
  status: string;
  requestedAt: Date;
  updatedAt: Date;
  reviewReasonCode?: string | null;
  reviewedAt?: Date | null;
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
    reviewReasonCode: row?.reviewReasonCode ?? null,
    reviewedAt: row?.reviewedAt?.toISOString() ?? null,
  };
}

class LalamoveOnboardingService {
  async getStatus(restaurantIdInput: unknown) {
    const restaurantId = positiveId(restaurantIdInput, 'Restaurante');
    return withTenantDbContext(restaurantId, async (tx) => {
      const row = await tx.restaurantExternalDeliveryOnboarding.findUnique({
        where: { restaurantId_provider: { restaurantId, provider: PROVIDER } },
        select: { status: true, requestedAt: true, updatedAt: true, reviewReasonCode: true, reviewedAt: true },
      });
      return overview(row);
    });
  }

  async requestConnection(restaurantIdInput: unknown, requestedByInput: unknown) {
    const restaurantId = positiveId(restaurantIdInput, 'Restaurante');
    const requestedByUserId = positiveId(requestedByInput, 'Administrador');
    return withTenantDbContext(restaurantId, async (tx) => {
      const requester = await tx.user.findFirst({
        where: { id: requestedByUserId, restaurantId, role: 'ADMIN', active: true },
        select: { id: true, name: true, role: true },
      });
      if (!requester) throw new Error('Administrador deste restaurante não autorizado.');

      // ON CONFLICT DO NOTHING makes repeated and concurrent requests idempotent.
      // Neither the restaurant nor the endpoint may set connection status.
      const created = await tx.restaurantExternalDeliveryOnboarding.createMany({
        data: [{
          restaurantId,
          provider: PROVIDER,
          status: 'REQUESTED',
          requestedByUserId,
        }],
        skipDuplicates: true,
      });
      if (created.count === 1) {
        await tx.auditLog.create({
          data: {
            userId: requester.id,
            userName: requester.name,
            userRole: requester.role,
            restaurantId,
            action: 'LALAMOVE_ONBOARDING_REQUESTED',
            resource: `RestaurantExternalDeliveryOnboarding:${restaurantId}`,
            metadata: { provider: PROVIDER, status: 'REQUESTED' },
          },
        });
      }
      const row = await tx.restaurantExternalDeliveryOnboarding.findUniqueOrThrow({
        where: { restaurantId_provider: { restaurantId, provider: PROVIDER } },
        select: { status: true, requestedAt: true, updatedAt: true, reviewReasonCode: true, reviewedAt: true },
      });
      return overview(row);
    });
  }
}

export default new LalamoveOnboardingService();
