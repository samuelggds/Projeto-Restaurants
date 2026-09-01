import { CourierCompensationModel, type Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

const policyInclude = {
  ranges: { orderBy: { maxDistanceMeters: 'asc' as const } },
} satisfies Prisma.CourierCompensationPolicyInclude;

export async function findEffectiveCompensationPolicy(
  db: Db,
  restaurantId: number,
  courierId?: number | null,
) {
  const override = courierId
    ? await db.courierCompensationPolicy.findFirst({
        where: { restaurantId, courierId },
        include: policyInclude,
      })
    : null;
  if (override) return { ...override, source: 'COURIER_OVERRIDE' as const };

  const restaurantDefault = await db.courierCompensationPolicy.findFirst({
    where: { restaurantId, courierId: null },
    include: policyInclude,
  });
  if (restaurantDefault) return { ...restaurantDefault, source: 'RESTAURANT_DEFAULT' as const };

  const legacy = await db.restaurantSettings.findUnique({
    where: { restaurantId },
    select: { courierFeePerDelivery: true },
  });
  return {
    id: null,
    publicId: null,
    restaurantId,
    courierId: null,
    model: CourierCompensationModel.FIXED_PER_DELIVERY,
    fixedAmount: legacy?.courierFeePerDelivery ?? 0,
    baseAmount: 0,
    includedDistanceMeters: 0,
    extraPerKmAmount: 0,
    version: 0,
    createdByUserId: null,
    createdAt: null,
    updatedAt: null,
    ranges: [],
    source: 'LEGACY_FIXED_FALLBACK' as const,
  };
}

export function serializeCompensationPolicy(
  policy: Awaited<ReturnType<typeof findEffectiveCompensationPolicy>>,
) {
  return {
    ...policy,
    fixedAmount: Number(policy.fixedAmount),
    baseAmount: Number(policy.baseAmount),
    extraPerKmAmount: Number(policy.extraPerKmAmount),
    ranges: policy.ranges.map((range) => ({ ...range, amount: Number(range.amount) })),
  };
}
