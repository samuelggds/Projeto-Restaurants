import assert from 'node:assert/strict';
import test from 'node:test';
import { withTenantDbContext } from '../../database/tenantDbContext.js';
import {
  claimNextItem,
  finishClaim,
} from '../../modules/aiSupport/services/AiImageBatchJobService.js';
import {
  prisma,
  runtimePrisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
} from './tenantE2EHarness.js';

async function insertBatch(
  restaurantId: number,
  actorUserId: number,
  productId: number,
  count: number,
) {
  return withTenantDbContext(restaurantId, async (db) => {
    const [job] = await db.$queryRaw<Array<{ id: bigint }>>`
      INSERT INTO "RestaurantAiJob" ("restaurantId", "actorUserId", "kind", "payload", "dedupeKey")
      VALUES (${restaurantId}, ${actorUserId}, 'PRODUCT_IMAGE_BATCH', '{}'::jsonb, 'recovery-e2e')
      RETURNING "id"
    `;
    for (let index = 0; index < count; index += 1) {
      await db.$executeRaw`
        INSERT INTO "RestaurantAiJobItem" ("jobId", "restaurantId", "entityType", "entityId", "dedupeKey")
        VALUES (${job.id}, ${restaurantId}, 'PRODUCT', ${String(productId)}, ${`item-${index}`})
      `;
    }
    return job.id;
  });
}

test('image batches serialize claims, recover interrupted work without retry and fence stale/cross-tenant completions', async () => {
  await resetTenantE2EDatabase();
  try {
    const fixture = await seedTenantE2EFixture();
    const a = fixture.restaurants.a.id;
    const b = fixture.restaurants.b.id;
    const jobA = await insertBatch(a, fixture.users.adminA.id, fixture.products.a.id, 2);
    const jobB = await insertBatch(b, fixture.users.adminB.id, fixture.products.b.id, 1);

    const claims = (await Promise.all(Array.from({ length: 8 }, () => claimNextItem(a)))).filter(
      Boolean,
    );
    assert.equal(claims.length, 1, 'Only one item from the same batch may be running.');
    const old = claims[0];
    assert.ok(old.lockToken);
    const otherTenant = await claimNextItem(b);
    assert.equal(otherTenant?.jobId, jobB, 'Independent tenants may claim their own batch.');
    assert.deepEqual(await runtimePrisma.$queryRaw`SELECT "id" FROM "RestaurantAiJobItem"`, []);

    await prisma.$executeRaw`
      UPDATE "RestaurantAiJob" SET "lockedUntil" = clock_timestamp() - INTERVAL '1 second'
      WHERE "id" = ${jobA}
    `;
    assert.equal(
      await finishClaim(old, { status: 'GENERATED' }, undefined, 10),
      false,
      'Expiry alone must reject completion before recovery.',
    );
    const current = await claimNextItem(a);
    assert.ok(current);
    assert.notEqual(
      current.itemId,
      old.itemId,
      'Expired item must not be generated a second time.',
    );
    assert.notEqual(current.lockToken, old.lockToken);
    const [recovered] = await withTenantDbContext(
      a,
      (db) => db.$queryRaw<Array<{ status: string; attempts: number; result: { reason: string } }>>`
      SELECT "status", "attempts", "result" FROM "RestaurantAiJobItem" WHERE "id" = ${old.itemId}
    `,
    );
    assert.equal(recovered.status, 'MANUAL_REQUIRED');
    assert.equal(recovered.attempts, 1);
    assert.equal(recovered.result.reason, 'CLAIM_EXPIRED');

    assert.equal(await finishClaim(old, { status: 'GENERATED' }, undefined, 10), false);
    assert.equal(await finishClaim(old, {}, new Error('stale failure')), false);
    assert.equal(
      await finishClaim({ ...current, restaurantId: b }, { status: 'GENERATED' }, undefined, 10),
      false,
    );
    const [stillOwned] = await withTenantDbContext(
      a,
      (db) => db.$queryRaw<Array<{ lockToken: string; actualCreditUsd: unknown }>>`
      SELECT "lockToken", "actualCreditUsd" FROM "RestaurantAiJob" WHERE "id" = ${jobA}
    `,
    );
    assert.equal(stillOwned.lockToken, current.lockToken);
    assert.equal(Number(stillOwned.actualCreditUsd), 0);

    const completions = await Promise.all([
      finishClaim(current, { status: 'GENERATED' }, undefined, 0.009),
      finishClaim(current, { status: 'GENERATED' }, undefined, 0.009),
    ]);
    assert.equal(
      completions.filter(Boolean).length,
      1,
      'Concurrent completions must record cost once.',
    );
    assert.equal(await finishClaim(current, { status: 'GENERATED' }, undefined, 0.009), false);
    assert.equal(await claimNextItem(a), null);
    const [finished] = await withTenantDbContext(
      a,
      (db) => db.$queryRaw<
        Array<{ status: string; lockToken: string | null; actualCreditUsd: unknown }>
      >`
      SELECT "status", "lockToken", "actualCreditUsd" FROM "RestaurantAiJob" WHERE "id" = ${jobA}
    `,
    );
    assert.equal(
      finished.status,
      'PARTIAL',
      'Interrupted work must remain visible for manual review.',
    );
    assert.equal(finished.lockToken, null);
    assert.equal(Number(finished.actualCreditUsd), 0.009);
    assert.equal(await finishClaim(otherTenant, { status: 'GENERATED' }, undefined, 0.009), true);
  } finally {
    await resetTenantE2EDatabase();
  }
});
