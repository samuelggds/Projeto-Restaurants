import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import aiCreditService from '../../modules/aiSupport/services/AiCreditService.js';
import { prisma, resetTenantE2EDatabase, seedTenantE2EFixture } from './tenantE2EHarness.js';

test('recargas estornadas preservam reservas, cobram dívida e não recriam crédito por replay', async () => {
  await resetTenantE2EDatabase();
  try {
    const fixture = await seedTenantE2EFixture();
    const actor = { userId: fixture.users.adminA.id, restaurantId: fixture.restaurants.a.id };
    const createTopUp = async (micros: bigint) => {
      const publicId = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO "AiCreditTopUp" ("publicId", "restaurantId", "adminUserId", "requestedByUserId", "creditUsdMicros",
          "exchangeRateBrlPerUsd", "exchangeRateSource", "exchangeRateQuotedAt", "baseAmountBrl", "markupPercent", "amountBrl", "paymentMethod")
        VALUES (${publicId}, ${actor.restaurantId}, ${actor.userId}, ${actor.userId}, ${micros},
          5, 'TEST', CURRENT_TIMESTAMP, 25, 20, 30, 'PIX')
      `;
      return {
        topUpPublicId: publicId,
        amountUsdMicros: micros,
        providerPaymentId: `test-${publicId}`,
      };
    };
    const purchase = await createTopUp(5_000_000n);
    await Promise.all(
      Array.from({ length: 4 }, () => aiCreditService.creditPurchase(actor, purchase)),
    );
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 7);
    const usage = { ...actor, feature: 'REVERSAL_TEST', model: 'test', budgetUsd: 6 };
    const reservationId = await aiCreditService.reserve(usage);
    const reversal = {
      ...purchase,
      cumulativeUsdMicros: 5_000_000n,
      reason: 'CHARGED_BACK' as const,
    };
    await Promise.all(
      Array.from({ length: 4 }, () => aiCreditService.reversePurchase(actor, reversal)),
    );
    const held = await aiCreditService.getBalance(actor);
    assert.equal(held.balanceUsd, 0);
    assert.equal(held.reservedUsd, 6);
    assert.equal(held.debtUsd, 4);
    await aiCreditService.settleReservation({ ...usage, reservationId, costUsd: 6 });
    await aiCreditService.creditPurchase(actor, purchase);
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 0);
    await aiCreditService.creditPurchase(actor, await createTopUp(3_000_000n));
    assert.equal((await aiCreditService.getBalance(actor)).debtUsd, 1);
    await assert.rejects(aiCreditService.reserve({ ...usage, budgetUsd: 0.01 }));
    await aiCreditService.creditPurchase(actor, await createTopUp(2_000_000n));
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 1);

    const partial = await createTopUp(4_000_000n);
    await aiCreditService.creditPurchase(actor, partial);
    for (const amount of [1_000_000n, 2_000_000n, 1_000_000n, 2_000_000n]) {
      await aiCreditService.reversePurchase(actor, {
        ...partial,
        cumulativeUsdMicros: amount,
        reason: 'REFUNDED',
      });
    }
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 3);
    await aiCreditService.creditPurchase(actor, partial);
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 3);
    const reversedFirst = await createTopUp(1_000_000n);
    await aiCreditService.reversePurchase(actor, {
      ...reversedFirst,
      cumulativeUsdMicros: 1_000_000n,
      reason: 'REFUNDED',
    });
    await aiCreditService.creditPurchase(actor, reversedFirst);
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 3);
    await assert.rejects(
      aiCreditService.reversePurchase(
        { userId: fixture.users.adminB.id, restaurantId: fixture.restaurants.b.id },
        reversal,
      ),
    );
    await assert.rejects(
      aiCreditService.reversePurchase(actor, {
        ...reversal,
        providerPaymentId: 'different-payment',
      }),
    );

    const partialFirst = await createTopUp(4_000_000n);
    const earlyRefund = {
      ...partialFirst,
      cumulativeUsdMicros: 1_000_000n,
      reason: 'REFUNDED' as const,
    };
    await Promise.all([
      aiCreditService.reversePurchase(actor, earlyRefund),
      aiCreditService.creditPurchase(actor, partialFirst),
      aiCreditService.reversePurchase(actor, earlyRefund),
    ]);
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 6);
    const beforePartial = await createTopUp(4_000_000n);
    await aiCreditService.reversePurchase(actor, {
      ...beforePartial,
      cumulativeUsdMicros: 1_000_000n,
      reason: 'REFUNDED',
    });
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 9);
    await aiCreditService.creditPurchase(actor, beforePartial);
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 9);

    const pending = await createTopUp(2_000_000n);
    const heldAt = new Date('2026-09-21T12:00:00Z');
    await aiCreditService.creditPurchase(actor, pending);
    await aiCreditService.holdPurchaseForReconciliation(actor, { ...pending, snapshotAt: heldAt });
    assert.equal((await aiCreditService.getBalance(actor)).pendingReversal, true);
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 0);
    await assert.rejects(aiCreditService.reserve({ ...usage, budgetUsd: 0.01 }));
    await aiCreditService.creditPurchase(actor, {
      ...pending,
      snapshotAt: new Date('2026-09-21T11:00:00Z'),
    });
    assert.equal((await aiCreditService.getBalance(actor)).pendingReversal, true);
    await aiCreditService.reversePurchase(actor, {
      ...pending,
      cumulativeUsdMicros: 500_000n,
      reason: 'REFUNDED',
      snapshotAt: new Date('2026-09-21T13:00:00Z'),
    });
    assert.equal((await aiCreditService.getBalance(actor)).pendingReversal, false);
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 10.5);
    await aiCreditService.holdPurchaseForReconciliation(actor, { ...pending, snapshotAt: heldAt });
    assert.equal((await aiCreditService.getBalance(actor)).pendingReversal, false);

    const mediation = await createTopUp(1_000_000n);
    await aiCreditService.holdPurchaseForReconciliation(actor, {
      ...mediation,
      snapshotAt: heldAt,
    });
    await aiCreditService.creditPurchase(actor, { ...mediation, snapshotAt: heldAt });
    assert.equal((await aiCreditService.getBalance(actor)).pendingReversal, true);
    await aiCreditService.creditPurchase(actor, {
      ...mediation,
      snapshotAt: new Date('2026-09-21T14:00:00Z'),
    });
    assert.equal((await aiCreditService.getBalance(actor)).pendingReversal, false);
    assert.equal((await aiCreditService.getBalance(actor)).balanceUsd, 11.5);
    const [ledger] = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) FROM "AiCreditLedgerEntry" WHERE "referenceId" = ${purchase.topUpPublicId} AND "kind" = 'ADJUSTMENT'
    `;
    assert.equal(ledger.count, 1n);
  } finally {
    await resetTenantE2EDatabase();
    await prisma.$disconnect();
  }
});
