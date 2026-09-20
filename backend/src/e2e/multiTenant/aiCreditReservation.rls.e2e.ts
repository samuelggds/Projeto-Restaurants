import assert from 'node:assert/strict';
import test from 'node:test';
import { withTenantDbContext } from '../../database/tenantDbContext.js';
import aiCreditService from '../../modules/aiSupport/services/AiCreditService.js';
import { reconcileAiCreditReservation } from '../../../scripts/_shared/reconcileAiCreditReservation.js';
import {
  prisma,
  runtimePrisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
} from './tenantE2EHarness.js';

test('AI reservations serialize replicas, settle once and enforce tenant RLS', async () => {
  await resetTenantE2EDatabase();
  try {
    const fixture = await seedTenantE2EFixture();
    const actor = { userId: fixture.users.adminA.id, restaurantId: fixture.restaurants.a.id };
    await withTenantDbContext(actor.restaurantId, async (db) => {
      const [row] = await db.$queryRaw<
        Array<{ zone: string }>
      >`SELECT current_setting('TimeZone') AS zone`;
      assert.equal(row.zone, 'UTC');
    });
    const request = { ...actor, feature: 'RESERVATION_E2E', model: 'gpt-4o', budgetUsd: 0.5 };
    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, () => aiCreditService.reserve(request)),
    );
    const successful = attempts.filter((attempt) => attempt.status === 'fulfilled');
    assert.equal(successful.length, 1, 'Only one replica may consume this wallet at a time.');
    const id = successful[0].value;
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 1.5);
    assert.equal((await aiCreditService.getBalance(actor)).reservedUsd, 0.5);
    assert.deepEqual(await runtimePrisma.$queryRaw`SELECT "id" FROM "AiCreditReservation"`, []);
    await withTenantDbContext(fixture.restaurants.b.id, async (db) => {
      assert.deepEqual(await db.$queryRaw`SELECT "id" FROM "AiCreditReservation"`, []);
      assert.equal(
        await db.$executeRaw`UPDATE "AiCreditReservation" SET "status" = 'RELEASED' WHERE "id" = ${id}::uuid`,
        0,
      );
    });
    await assert.rejects(
      aiCreditService.settleReservation({
        ...request,
        userId: fixture.users.adminB.id,
        restaurantId: fixture.restaurants.b.id,
        reservationId: id,
        costUsd: 0.1,
      }),
    );
    await assert.rejects(
      aiCreditService.settleReservation({ ...request, reservationId: id, costUsd: 0.6 }),
    );
    assert.equal((await aiCreditService.getBalance(actor)).reservedUsd, 0.5);

    const usage = { ...request, reservationId: id, costUsd: 0.1 };
    await Promise.all([
      aiCreditService.settleReservation(usage),
      aiCreditService.settleReservation(usage),
    ]);
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 1.9);
    assert.equal((await aiCreditService.getBalance(actor)).reservedUsd, 0);
    const [ledger] = await withTenantDbContext(
      actor.restaurantId,
      (db) =>
        db.$queryRaw<
          Array<{ count: bigint }>
        >`SELECT COUNT(*) FROM "AiCreditLedgerEntry" WHERE "kind" = 'USAGE'`,
    );
    assert.equal(Number(ledger.count), 1);

    const pendingId = await aiCreditService.reserve(request);
    await aiCreditService.markReservation(actor, pendingId, 'UNCERTAIN');
    await assert.rejects(aiCreditService.reserve(request));
    await aiCreditService.markReservation(actor, pendingId, 'RELEASED');
    assert.equal(
      (await aiCreditService.getBalance(actor)).pendingRequest,
      true,
      'Uncertain requests cannot be refunded automatically.',
    );
    await aiCreditService.settleReservation({ ...usage, reservationId: pendingId });
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 1.8);
    const reconciliationId = await aiCreditService.reserve(request);
    const reconciliation = {
      restaurantId: actor.restaurantId,
      adminUserId: actor.userId,
      reservationId: reconciliationId,
      costUsd: 0,
      actor: 'test-operator',
      reason: 'Provider confirmed no charge',
      evidence: 'test-ticket-123',
      apply: true,
    };
    await assert.rejects(reconcileAiCreditReservation(reconciliation), /execução/);
    await aiCreditService.markReservation(actor, reconciliationId, 'UNCERTAIN');
    await assert.rejects(
      reconcileAiCreditReservation({ ...reconciliation, restaurantId: fixture.restaurants.b.id }),
      /não encontrada/,
    );
    const dryRun = await reconcileAiCreditReservation({ ...reconciliation, apply: false });
    assert.equal(dryRun.applied, false);
    assert.equal((await aiCreditService.getBalance(actor)).pendingRequest, true);
    const reconciled = await reconcileAiCreditReservation(reconciliation);
    assert.equal(reconciled.nextStatus, 'RELEASED');
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 1.8);
    assert.equal((await reconcileAiCreditReservation(reconciliation)).alreadyReconciled, true);
    assert.equal(await prisma.auditLog.count({ where: { action: 'RECONCILE_AI_CREDIT' } }), 1);
    await assert.rejects(
      reconcileAiCreditReservation({ ...reconciliation, costUsd: 0.1 }),
      /outro custo/,
    );
    const overBudgetId = await aiCreditService.reserve(request);
    await aiCreditService.markReservation(actor, overBudgetId, 'UNCERTAIN');
    const overBudget = { ...reconciliation, reservationId: overBudgetId, costUsd: 0.6 };
    await assert.rejects(
      reconcileAiCreditReservation({ ...overBudget, costUsd: 2 }),
      /Saldo insuficiente/,
    );
    assert.equal((await reconcileAiCreditReservation(overBudget)).exceedsReservation, true);
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 1.2);
    assert.equal((await reconcileAiCreditReservation(overBudget)).alreadyReconciled, true);
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 1.2);
    await assert.rejects(aiCreditService.reserve({ ...request, budgetUsd: 3 }));
    await prisma.user.update({ where: { id: actor.userId }, data: { active: false } });
    await assert.rejects(aiCreditService.reserve(request));
  } finally {
    await resetTenantE2EDatabase();
    await Promise.all([prisma.$disconnect(), runtimePrisma.$disconnect()]);
  }
});
