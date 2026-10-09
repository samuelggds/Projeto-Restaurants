import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertSecureRuntimeDatabaseRole,
  withTenantDbContext,
} from '../../database/tenantDbContext.js';
import onboarding from '../../modules/externalDelivery/services/LalamoveOnboardingService.js';
import review, { LalamoveReviewError } from '../../modules/externalDelivery/services/LalamoveReviewService.js';
import { LalamoveCredentialService } from '../../modules/externalDelivery/services/LalamoveCredentialService.js';
import {
  assertDisposableTenantDatabase,
  prisma,
  resetTenantE2EDatabase,
  runtimePrisma,
  seedTenantE2EFixture,
} from './tenantE2EHarness.js';

function statusIs(statusCode: number) {
  return (error: unknown) => error instanceof LalamoveReviewError && error.statusCode === statusCode;
}

// The existing runner discovers .rls.e2e.ts and provisions an isolated PostgreSQL
// owner plus a distinct NOSUPERUSER/NOBYPASSRLS application role. No provider calls.
test('Lalamove onboarding and review enforce real PostgreSQL tenant isolation', { timeout: 90_000 }, async (t) => {
  t.after(async () => {
    await runtimePrisma.$disconnect();
    await prisma.$disconnect();
  });
  await resetTenantE2EDatabase();
  await assertSecureRuntimeDatabaseRole();
  const fixture = await seedTenantE2EFixture();
  const tenantA = fixture.restaurants.a.id;
  const tenantB = fixture.restaurants.b.id;
  const actor = await prisma.user.create({
    data: {
      name: 'Platform reviewer E2E',
      email: 'lalamove-reviewer@tenant-e2e.test',
      password: fixture.users.adminA.password,
      role: 'SUPER_ADMIN',
      active: true,
      restaurantId: null,
    },
  });
  const context = { ipAddress: null, requestId: 'lalamove-rls-e2e', userAgent: null };
  const lookup = (restaurantId: number) => ({ restaurantId_provider: { restaurantId, provider: 'LALAMOVE' } });
  const reviewAudits = () => prisma.auditLog.count({ where: { action: 'LALAMOVE_ONBOARDING_REVIEWED' } });
  const ordersBefore = await prisma.order.findMany({ orderBy: { id: 'asc' } });
  const couriersBefore = await prisma.user.findMany({ where: { role: 'MOTOQUEIRO' }, orderBy: { id: 'asc' } });
  const paymentSettingsBefore = await prisma.restaurantSettings.findMany({ orderBy: { restaurantId: 'asc' } });

  await t.test('concurrent requests persist one row and one audit per restaurant', async () => {
    const requests = await Promise.all([
      onboarding.requestConnection(tenantA, fixture.users.adminA.id),
      onboarding.requestConnection(tenantA, fixture.users.adminA.id),
      onboarding.requestConnection(tenantB, fixture.users.adminB.id),
    ]);
    for (const result of requests) {
      assert.equal(result.status, 'REQUESTED');
      assert.equal(result.connected, false);
      assert.equal(result.canDispatch, false);
    }
    assert.equal(await prisma.restaurantExternalDeliveryOnboarding.count(), 2);
    for (const restaurantId of [tenantA, tenantB]) {
      assert.equal(await prisma.auditLog.count({ where: {
        restaurantId, action: 'LALAMOVE_ONBOARDING_REQUESTED',
      } }), 1);
    }
    await assert.rejects(
      () => onboarding.requestConnection(tenantB, fixture.users.adminA.id),
      /não autorizado/u,
    );
    await assert.rejects(
      () => onboarding.requestConnection(tenantA, fixture.users.customerA.id),
      /não autorizado/u,
    );
  });

  await t.test('unfiltered ORM and SQL reads cannot cross the active tenant or escape the transaction', async () => {
    assert.deepEqual(await runtimePrisma.restaurantExternalDeliveryOnboarding.findMany(), []);
    for (const restaurantId of [tenantA, tenantB]) {
      await withTenantDbContext(restaurantId, async (db) => {
        const rows = await db.restaurantExternalDeliveryOnboarding.findMany();
        assert.deepEqual(rows.map(row => row.restaurantId), [restaurantId]);
        const raw = await db.$queryRaw<Array<{ restaurantId: number }>>`
          SELECT "restaurantId" FROM "RestaurantExternalDeliveryOnboarding"
        `;
        assert.deepEqual(raw, [{ restaurantId }]);
      });
    }
    assert.deepEqual(await runtimePrisma.restaurantExternalDeliveryOnboarding.findMany(), []);
  });

  await t.test('RLS blocks cross-tenant writes and the composite FK rejects a foreign requester', async () => {
    const rowA = await prisma.restaurantExternalDeliveryOnboarding.findUniqueOrThrow({ where: lookup(tenantA) });
    const rowB = await prisma.restaurantExternalDeliveryOnboarding.findUniqueOrThrow({ where: lookup(tenantB) });
    await withTenantDbContext(tenantA, async (db) => {
      const changed = await db.restaurantExternalDeliveryOnboarding.updateMany({
        where: { id: rowB.id }, data: { status: 'IN_REVIEW' },
      });
      assert.equal(changed.count, 0);
      const removed = await db.restaurantExternalDeliveryOnboarding.deleteMany({ where: { id: rowB.id } });
      assert.equal(removed.count, 0);
    });
    await assert.rejects(
      () => withTenantDbContext(tenantA, db => db.restaurantExternalDeliveryOnboarding.updateMany({
        where: { id: rowA.id }, data: { restaurantId: tenantB },
      })),
      /row-level security|violates.*policy|operation failed/iu,
    );
    await assert.rejects(
      () => withTenantDbContext(tenantA, db => db.restaurantExternalDeliveryOnboarding.updateMany({
        where: { id: rowA.id }, data: { requestedByUserId: fixture.users.adminB.id },
      })),
      /foreign key|constraint/iu,
    );
    assert.deepEqual(await prisma.restaurantExternalDeliveryOnboarding.findUniqueOrThrow({ where: lookup(tenantA) }), rowA);
    assert.deepEqual(await prisma.restaurantExternalDeliveryOnboarding.findUniqueOrThrow({ where: lookup(tenantB) }), rowB);
  });

  await t.test('only an active platform reviewer may aggregate and review requests', async () => {
    for (const denied of [fixture.users.adminA.id, fixture.users.customerB.id, fixture.users.courierA.id]) {
      await assert.rejects(() => review.listRequests(denied), statusIs(403));
    }
    const queue = await review.listRequests(actor.id);
    assert.deepEqual(queue.requests.map(item => item.restaurantId).sort((a, b) => a - b), [tenantA, tenantB]);
    assert.equal(queue.nextCursor, null);
    for (const item of queue.requests) {
      assert.equal(item.restaurant.id, item.restaurantId);
      assert.equal(item.connected, false);
      assert.equal(item.canDispatch, false);
    }
  });

  await t.test('two real concurrent reviews have one winner, one conflict and one audit', async () => {
    const row = await prisma.restaurantExternalDeliveryOnboarding.findUniqueOrThrow({ where: lookup(tenantA) });
    const untouched = await prisma.restaurantExternalDeliveryOnboarding.findUniqueOrThrow({ where: lookup(tenantB) });
    const payload = {
      status: 'IN_REVIEW', expectedStatus: row.status,
      expectedUpdatedAt: row.updatedAt.toISOString(), reasonCode: null,
    };
    await assert.rejects(() => review.updateRequest(fixture.users.adminA.id, tenantA, payload, context), statusIs(403));
    const results = await Promise.allSettled([
      review.updateRequest(actor.id, tenantA, payload, context),
      review.updateRequest(actor.id, tenantA, payload, context),
    ]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const failures = results.filter(result => result.status === 'rejected');
    assert.equal(failures.length, 1);
    assert.ok(statusIs(409)(failures[0].reason));
    assert.equal(await reviewAudits(), 1);
    const updated = await onboarding.getStatus(tenantA);
    assert.equal(updated.status, 'IN_REVIEW');
    assert.equal(updated.connected, false);
    assert.equal(updated.canDispatch, false);
    assert.deepEqual(await prisma.restaurantExternalDeliveryOnboarding.findUniqueOrThrow({ where: lookup(tenantB) }), untouched);
    await assert.rejects(() => review.updateRequest(actor.id, tenantA, payload, context), statusIs(409));
    assert.equal(await reviewAudits(), 1);
  });

  await t.test('a real database audit failure rolls back the review update', async () => {
    const before = await prisma.restaurantExternalDeliveryOnboarding.findUniqueOrThrow({ where: lookup(tenantA) });
    const countBefore = await reviewAudits();
    // Failure injection is restricted to the disposable loopback E2E database.
    // NOT VALID preserves existing rows but rejects new review audit inserts.
    assertDisposableTenantDatabase();
    await prisma.$executeRaw`
      ALTER TABLE "AuditLog" ADD CONSTRAINT "lalamove_e2e_reject_review_audit"
      CHECK ("action" <> 'LALAMOVE_ONBOARDING_REVIEWED') NOT VALID
    `;
    try {
      await assert.rejects(() => review.updateRequest(actor.id, tenantA, {
        status: 'ACTION_REQUIRED', expectedStatus: before.status,
        expectedUpdatedAt: before.updatedAt.toISOString(), reasonCode: 'PROVIDER_APPROVAL',
      }, context), /constraint/iu);
    } finally {
      await prisma.$executeRaw`ALTER TABLE "AuditLog" DROP CONSTRAINT "lalamove_e2e_reject_review_audit"`;
    }
    assert.deepEqual(await prisma.restaurantExternalDeliveryOnboarding.findUniqueOrThrow({ where: lookup(tenantA) }), before);
    assert.equal(await reviewAudits(), countBefore);
    assert.deepEqual(await runtimePrisma.restaurantExternalDeliveryOnboarding.findMany(), []);
  });

  await t.test('activation payloads are rejected and a disabled reviewer loses access immediately', async () => {
    const row = await prisma.restaurantExternalDeliveryOnboarding.findUniqueOrThrow({ where: lookup(tenantB) });
    for (const status of ['ACTIVE', 'CONNECTED']) {
      await assert.rejects(() => review.updateRequest(actor.id, tenantB, {
        status, expectedStatus: row.status, expectedUpdatedAt: row.updatedAt.toISOString(), reasonCode: null,
      }, context), statusIs(400));
    }
    await prisma.user.update({ where: { id: actor.id }, data: { active: false } });
    await assert.rejects(() => review.listRequests(actor.id), statusIs(403));
    await assert.rejects(() => review.updateRequest(actor.id, tenantB, {
      status: 'IN_REVIEW', expectedStatus: row.status,
      expectedUpdatedAt: row.updatedAt.toISOString(), reasonCode: null,
    }, context), statusIs(403));
    assert.deepEqual(await prisma.restaurantExternalDeliveryOnboarding.findUniqueOrThrow({ where: lookup(tenantB) }), row);
  });

  await t.test('review flows leave orders, own couriers and payment settings untouched', async () => {
    assert.deepEqual(await prisma.order.findMany({ orderBy: { id: 'asc' } }), ordersBefore);
    assert.deepEqual(await prisma.user.findMany({ where: { role: 'MOTOQUEIRO' }, orderBy: { id: 'asc' } }), couriersBefore);
    assert.deepEqual(await prisma.restaurantSettings.findMany({ orderBy: { restaurantId: 'asc' } }), paymentSettingsBefore);
  });


  await t.test('credential vault enforces real PostgreSQL RLS, encryption, versioning and revocation', async () => {
    const originalKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
    const originalIdentityKey = process.env.LALAMOVE_ACCOUNT_IDENTITY_HMAC_KEY;
    process.env.CREDENTIAL_ENCRYPTION_KEY = Buffer.from('gastro-lalamove-e2e-32-byte-key!').toString('base64');
    process.env.LALAMOVE_ACCOUNT_IDENTITY_HMAC_KEY = Buffer.from('lalamove-identity-key-32-bytes!!').toString('base64');
    await prisma.user.update({ where: { id: actor.id }, data: { active: true } });
    const vault = new LalamoveCredentialService({
      database: runtimePrisma,
      tenant: withTenantDbContext,
      verify: async () => undefined,
    });
    const sandbox = {
      environment: 'sandbox' as const, apiKey: 'pk_' + 'test_TenantAlphaEncrypted001',
      apiSecret: 'sk_' + 'test_TenantAlphaEncrypted001', expectedVersion: 0,
    };
    try {
      const tenantARecord = await prisma.restaurantExternalDeliveryOnboarding.findUniqueOrThrow({ where: lookup(tenantA) });
      if (tenantARecord.status !== 'IN_REVIEW') {
        await prisma.restaurantExternalDeliveryOnboarding.update({ where: lookup(tenantA), data: { status: 'IN_REVIEW' } });
      }
      const saved = await vault.configure(actor.id, tenantA, sandbox);
      assert.equal(saved.status, 'STORED');
      assert.equal(saved.connected, false);
      assert.equal(saved.canDispatch, false);
      assert.equal(saved.version, 1);
      assert.equal(JSON.stringify(saved).includes('Encrypted001'), false);
      const rows = await prisma.restaurantExternalDeliveryCredential.findMany();
      assert.equal(rows.length, 1);
      assert.ok(rows[0].apiKeyEncrypted?.startsWith('enc:v1:'));
      assert.ok(rows[0].apiSecretEncrypted?.startsWith('enc:v1:'));
      assert.equal(JSON.stringify(rows).includes('pk_test_TenantAlphaEncrypted001'), false);
      assert.deepEqual(await runtimePrisma.restaurantExternalDeliveryCredential.findMany(), []);
      await withTenantDbContext(tenantB, async db => {
        assert.deepEqual(await db.restaurantExternalDeliveryCredential.findMany(), []);
        assert.equal((await db.restaurantExternalDeliveryCredential.deleteMany({
          where: { restaurantId: tenantA },
        })).count, 0);
      });
      await withTenantDbContext(tenantA, async db => {
        const own = await db.restaurantExternalDeliveryCredential.findMany();
        assert.equal(own.length, 1);
        assert.equal(own[0].restaurantId, tenantA);
      });
      await assert.rejects(() => vault.configure(fixture.users.adminA.id, tenantA, sandbox), statusIs(403));
      await assert.rejects(() => vault.configure(actor.id, tenantB, sandbox), statusIs(409));
      await assert.rejects(() => vault.configure(actor.id, tenantA, sandbox), statusIs(409));
      await prisma.restaurantExternalDeliveryOnboarding.update({
        where: lookup(tenantB), data: { status: 'IN_REVIEW' },
      });
      await assert.rejects(() => vault.configure(actor.id, tenantB, sandbox), statusIs(409));
      const other = await vault.configure(actor.id, tenantB, {
        ...sandbox, apiKey: 'pk_' + 'test_TenantBetaIndependent002',
        apiSecret: 'sk_' + 'test_TenantBetaIndependent002',
      });
      assert.equal(other.version, 1);
      assert.deepEqual((await withTenantDbContext(tenantB, db =>
        db.restaurantExternalDeliveryCredential.findMany()
      )).map(row => row.restaurantId), [tenantB]);
      const validated = await vault.verifySandbox(actor.id, tenantA, { expectedVersion: saved.version });
      assert.equal(validated.status, 'VERIFIED_SANDBOX');
      assert.equal(validated.version, 2);
      await assert.rejects(() => vault.verifySandbox(actor.id, tenantA, { expectedVersion: 1 }), statusIs(409));
      const revoked = await vault.revoke(actor.id, tenantA, 'sandbox', { expectedVersion: 2 });
      assert.equal(revoked.status, 'REVOKED');
      assert.equal(revoked.configured, false);
      const after = await prisma.restaurantExternalDeliveryCredential.findFirstOrThrow({
        where: { restaurantId: tenantA },
      });
      assert.equal(after.apiKeyEncrypted, null);
      assert.equal(after.apiSecretEncrypted, null);
      assert.equal(after.apiKeyDigest, null);
      const preservedB = await prisma.restaurantExternalDeliveryCredential.findFirstOrThrow({
        where: { restaurantId: tenantB },
      });
      assert.equal(preservedB.status, 'STORED');
      assert.ok(preservedB.apiKeyEncrypted?.startsWith('enc:v1:'));
      assert.equal((await prisma.auditLog.count({ where: { restaurantId: tenantA, action: { startsWith: 'LALAMOVE_CREDENTIAL_' } } })), 3);
      await assert.rejects(() => vault.verifySandbox(actor.id, tenantA, { expectedVersion: 3 }), statusIs(409));
    } finally {
      if (originalKey === undefined) delete process.env.CREDENTIAL_ENCRYPTION_KEY;
      else process.env.CREDENTIAL_ENCRYPTION_KEY = originalKey;
      if (originalIdentityKey === undefined) delete process.env.LALAMOVE_ACCOUNT_IDENTITY_HMAC_KEY;
      else process.env.LALAMOVE_ACCOUNT_IDENTITY_HMAC_KEY = originalIdentityKey;
      await prisma.user.update({ where: { id: actor.id }, data: { active: false } });
    }
  });
});
