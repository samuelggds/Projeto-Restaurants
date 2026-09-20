import { Prisma } from '@prisma/client';
import prisma from '../../src/config/prisma.js';
import { setTenantDbContext } from '../../src/database/tenantDbContext.js';

type ReconciliationInput = {
  restaurantId: number;
  adminUserId: number;
  reservationId: string;
  costUsd: number;
  actor: string;
  reason: string;
  evidence: string;
  apply: boolean;
};

// Operational entry point only: the CLI enforces environment/fingerprint,
// explicit production unlock, dry-run and an exact confirmation before apply.
// Provider evidence must be checked by the operator; elapsed time is not proof.
export async function reconcileAiCreditReservation(input: ReconciliationInput) {
  if (
    ![input.restaurantId, input.adminUserId].every((id) => Number.isSafeInteger(id) && id > 0) ||
    !/^[a-f0-9-]{36}$/iu.test(input.reservationId) ||
    !Number.isFinite(input.costUsd) ||
    input.costUsd < 0 ||
    input.costUsd > 100 ||
    input.actor.trim().length < 3 ||
    input.actor.length > 100 ||
    input.reason.trim().length < 8 ||
    input.reason.length > 500 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]{3,190}$/u.test(input.evidence)
  ) {
    throw new Error(
      'Parâmetros de conciliação inválidos. Use referências de evidência sem dados pessoais ou segredos.',
    );
  }
  const cost = BigInt(Math.ceil(input.costUsd * 1_000_000));
  return prisma.$transaction(async (db) => {
    await setTenantDbContext(db, input.restaurantId);
    await db.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${input.adminUserId})`);
    const [row] = await db.$queryRaw<
      Array<{
        status: string;
        reservedMicros: bigint;
        chargedMicros: bigint | null;
        balanceMicros: bigint;
        feature: string;
        model: string;
        stale: boolean;
      }>
    >(Prisma.sql`
      SELECT r."status", r."reservedMicros", r."chargedMicros", r."feature", r."model",
        w."balanceMicros", r."updatedAt" < CURRENT_TIMESTAMP - INTERVAL '30 minutes' AS stale
      FROM "AiCreditReservation" r JOIN "AiCreditWallet" w
        ON w."adminUserId" = r."adminUserId" AND w."restaurantId" = r."restaurantId"
      WHERE r."id" = ${input.reservationId}::uuid AND r."adminUserId" = ${input.adminUserId}
        AND r."restaurantId" = ${input.restaurantId}
    `);
    if (!row) throw new Error('Reserva não encontrada neste restaurante/administrador.');
    const closed = row.status === 'SETTLED' || row.status === 'RELEASED';
    if (closed && (row.chargedMicros ?? 0n) !== cost)
      throw new Error('Reserva encerrada com outro custo. Não é permitido sobrescrever.');
    if (row.status === 'HELD' && !row.stale)
      throw new Error('Solicitação ainda em execução. Não concilie antes de 30 minutos.');
    if (!closed && cost > row.balanceMicros)
      throw new Error(
        'Saldo insuficiente para o custo comprovado. A reserva será mantida até a regularização.',
      );
    const plan = {
      restaurantId: input.restaurantId,
      adminUserId: input.adminUserId,
      reservationId: input.reservationId,
      previousStatus: row.status,
      nextStatus: cost === 0n ? 'RELEASED' : 'SETTLED',
      costUsd: Number(cost) / 1_000_000,
      reservedUsd: Number(row.reservedMicros) / 1_000_000,
      exceedsReservation: cost > row.reservedMicros,
      alreadyReconciled: closed,
      applied: false,
    };
    if (!input.apply || closed) return plan;
    const after = row.balanceMicros - cost;
    if (cost > 0n) {
      await db.$executeRaw(Prisma.sql`
        UPDATE "AiCreditWallet" SET "balanceMicros" = ${after}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "adminUserId" = ${input.adminUserId} AND "restaurantId" = ${input.restaurantId}
      `);
      await db.$executeRaw(Prisma.sql`
        INSERT INTO "AiCreditLedgerEntry" ("restaurantId", "adminUserId", "kind", "amountMicros",
          "balanceAfterMicros", "idempotencyKey", "referenceType", "referenceId", "metadata")
        VALUES (${input.restaurantId}, ${input.adminUserId}, 'USAGE', ${-cost}, ${after},
          ${`ai-usage:${input.reservationId}`}, 'OPENAI_RECONCILIATION', ${input.reservationId},
          ${JSON.stringify({ model: row.model, feature: row.feature, evidence: input.evidence, operator: input.actor })}::jsonb)
      `);
    }
    await db.$executeRaw(Prisma.sql`
      UPDATE "AiCreditReservation" SET "status" = ${plan.nextStatus}, "chargedMicros" = ${cost}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${input.reservationId}::uuid AND "adminUserId" = ${input.adminUserId} AND "restaurantId" = ${input.restaurantId}
    `);
    await db.auditLog.create({
      data: {
        restaurantId: input.restaurantId,
        userName: input.actor,
        userRole: 'OPS_OPERATOR',
        action: 'RECONCILE_AI_CREDIT',
        resource: JSON.stringify({ ...plan, reason: input.reason, evidence: input.evidence }),
      },
    });
    return { ...plan, applied: true };
  });
}
