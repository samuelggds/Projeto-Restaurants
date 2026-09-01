import { CourierCompensationModel, UserRole, type Prisma } from '@prisma/client';

import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import {
  calculateCourierCompensation,
  compensationRequiresDistance,
  normalizeCompensationPolicy,
  type CompensationPolicyInput,
} from '../domain/courierCompensation.js';
import { normalizeRestaurantTimeZone } from '../domain/restaurantTimePeriods.js';
import {
  findEffectiveCompensationPolicy,
  serializeCompensationPolicy,
} from '../repositories/CourierCompensationRepository.js';

type AuditActor = { userId: number; role: string };

function normalizeId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`${label} inválido.`);
  return id;
}

export async function auditCourierFinance(
  db: Prisma.TransactionClient,
  input: AuditActor & {
    restaurantId: number;
    action: string;
    resource: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await db.auditLog.create({
    data: {
      userId: input.userId,
      userRole: input.role,
      restaurantId: input.restaurantId,
      action: input.action,
      resource: input.resource,
      metadata: input.metadata,
    },
  });
}

async function assertCourier(
  db: Prisma.TransactionClient,
  restaurantId: number,
  courierId: number,
) {
  const courier = await db.user.findFirst({
    where: { id: courierId, restaurantId, role: UserRole.MOTOQUEIRO, active: true },
    select: { id: true, name: true, email: true, active: true },
  });
  if (!courier) throw new Error('Motoqueiro não encontrado neste restaurante.');
  return courier;
}

async function persistPolicy(
  db: Prisma.TransactionClient,
  input: {
    restaurantId: number;
    courierId: number | null;
    actor: AuditActor;
    policy: CompensationPolicyInput;
  },
) {
  const normalized = normalizeCompensationPolicy(input.policy);
  const existing = await db.courierCompensationPolicy.findFirst({
    where: { restaurantId: input.restaurantId, courierId: input.courierId },
    select: { id: true, version: true },
  });
  const data = {
    model: normalized.model,
    fixedAmount: normalized.fixedAmount,
    baseAmount: normalized.baseAmount,
    includedDistanceMeters: normalized.includedDistanceMeters,
    extraPerKmAmount: normalized.extraPerKmAmount,
    createdByUserId: input.actor.userId,
  };

  let policyId: number;
  if (existing) {
    const updated = await db.courierCompensationPolicy.updateMany({
      where: { id: existing.id, restaurantId: input.restaurantId },
      data: { ...data, version: { increment: 1 } },
    });
    if (updated.count !== 1)
      throw new Error('A regra de remuneração foi alterada por outra sessão.');
    policyId = existing.id;
    await db.courierCompensationRange.deleteMany({
      where: { policyId, restaurantId: input.restaurantId },
    });
  } else {
    const created = await db.courierCompensationPolicy.create({
      data: { restaurantId: input.restaurantId, courierId: input.courierId, ...data },
      select: { id: true },
    });
    policyId = created.id;
  }

  if (normalized.ranges.length) {
    await db.courierCompensationRange.createMany({
      data: normalized.ranges.map((range) => ({
        restaurantId: input.restaurantId,
        policyId,
        maxDistanceMeters: range.maxDistanceMeters,
        amount: range.amount,
      })),
    });
  }

  if (!input.courierId && normalized.model === CourierCompensationModel.FIXED_PER_DELIVERY) {
    await db.restaurantSettings.updateMany({
      where: { restaurantId: input.restaurantId },
      data: { courierFeePerDelivery: normalized.fixedAmount },
    });
  }

  await auditCourierFinance(db, {
    ...input.actor,
    restaurantId: input.restaurantId,
    action: input.courierId
      ? 'COURIER_COMPENSATION_OVERRIDE_UPDATED'
      : 'COURIER_COMPENSATION_DEFAULT_UPDATED',
    resource: `CourierCompensationPolicy:${policyId}`,
    metadata: {
      courierId: input.courierId,
      model: normalized.model,
      rangeCount: normalized.ranges.length,
    },
  });

  return findEffectiveCompensationPolicy(db, input.restaurantId, input.courierId);
}

class CourierCompensationService {
  async getAdminConfiguration(restaurantIdInput: unknown) {
    const restaurantId = normalizeId(restaurantIdInput, 'Restaurante');
    return withTenantDbContext(restaurantId, async (db) => {
      const [policy, settings, couriers] = await Promise.all([
        findEffectiveCompensationPolicy(db, restaurantId),
        db.restaurantSettings.findUnique({
          where: { restaurantId },
          select: { timezone: true },
        }),
        db.user.findMany({
          where: { restaurantId, role: UserRole.MOTOQUEIRO },
          select: { id: true, name: true, email: true, active: true },
          orderBy: { name: 'asc' },
        }),
      ]);
      const overrides = await db.courierCompensationPolicy.findMany({
        where: { restaurantId, courierId: { not: null } },
        include: { ranges: { orderBy: { maxDistanceMeters: 'asc' } } },
      });
      const overrideByCourier = new Map(overrides.map((entry) => [entry.courierId, entry]));
      return {
        timezone: settings?.timezone || 'America/Sao_Paulo',
        defaultPolicy: serializeCompensationPolicy(policy),
        couriers: couriers.map((courier) => ({
          ...courier,
          override: overrideByCourier.get(courier.id)
            ? serializeCompensationPolicy({
                ...overrideByCourier.get(courier.id)!,
                source: 'COURIER_OVERRIDE' as const,
              })
            : null,
        })),
      };
    });
  }

  async updateDefault(input: {
    restaurantId: unknown;
    actor: AuditActor;
    policy: CompensationPolicyInput;
    timezone?: string;
  }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const timezone = normalizeRestaurantTimeZone(input.timezone);
    return withTenantDbContext(restaurantId, async (db) => {
      await db.restaurantSettings.updateMany({ where: { restaurantId }, data: { timezone } });
      const policy = await persistPolicy(db, {
        restaurantId,
        courierId: null,
        actor: input.actor,
        policy: input.policy,
      });
      return { timezone, defaultPolicy: serializeCompensationPolicy(policy) };
    });
  }

  async updateCourierOverride(input: {
    restaurantId: unknown;
    courierId: unknown;
    actor: AuditActor;
    policy: CompensationPolicyInput;
  }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const courierId = normalizeId(input.courierId, 'Motoqueiro');
    return withTenantDbContext(restaurantId, async (db) => {
      await assertCourier(db, restaurantId, courierId);
      const policy = await persistPolicy(db, {
        restaurantId,
        courierId,
        actor: input.actor,
        policy: input.policy,
      });
      return serializeCompensationPolicy(policy);
    });
  }

  async removeCourierOverride(input: {
    restaurantId: unknown;
    courierId: unknown;
    actor: AuditActor;
  }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const courierId = normalizeId(input.courierId, 'Motoqueiro');
    return withTenantDbContext(restaurantId, async (db) => {
      await assertCourier(db, restaurantId, courierId);
      const removed = await db.courierCompensationPolicy.deleteMany({
        where: { restaurantId, courierId },
      });
      await auditCourierFinance(db, {
        ...input.actor,
        restaurantId,
        action: 'COURIER_COMPENSATION_OVERRIDE_REMOVED',
        resource: `Courier:${courierId}`,
        metadata: { removed: removed.count === 1 },
      });
      return { removed: removed.count === 1 };
    });
  }

  async previewForCourier(input: {
    db: Prisma.TransactionClient;
    restaurantId: number;
    courierId: number;
    deliveryDistanceMeters: number | null;
  }) {
    const policy = await findEffectiveCompensationPolicy(
      input.db,
      input.restaurantId,
      input.courierId,
    );
    try {
      return {
        available: true as const,
        amount: Number(calculateCourierCompensation(policy, input.deliveryDistanceMeters)),
        model: policy.model,
        source: policy.source,
      };
    } catch (error) {
      return {
        available: false as const,
        amount: null,
        model: policy.model,
        source: policy.source,
        reason: error instanceof Error ? error.message : 'Não foi possível calcular o valor.',
      };
    }
  }

  compensationRequiresDistance = compensationRequiresDistance;
}

export { assertCourier };
export default new CourierCompensationService();
