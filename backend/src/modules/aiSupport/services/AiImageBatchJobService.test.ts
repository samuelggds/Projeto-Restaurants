import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import generateImportedProductImageService from '../../menuImport/services/GenerateImportedProductImageService.js';
import aiCreditService from './AiCreditService.js';
import { drainAiImageJobs, finishClaim } from './AiImageBatchJobService.js';

const claim = {
  jobId: 11n,
  jobPublicId: 'batch-a',
  itemId: 21n,
  itemPublicId: 'item-a',
  restaurantId: 7,
  actorUserId: 17,
  entityId: '31',
  lockToken: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
};

function sqlText(query: Prisma.Sql | TemplateStringsArray) {
  return Array.isArray(query) ? query.join('?') : (query as Prisma.Sql).sql;
}

function mockTransaction(t: TestContext, db: object) {
  const original = prisma.$transaction;
  prisma.$transaction = (async (callback: (client: object) => Promise<unknown>) =>
    callback(db)) as typeof original;
  t.after(() => {
    prisma.$transaction = original;
  });
}

test('expired image batch recovers without requesting generation or changing credit reservations', async (t) => {
  const writes: Prisma.Sql[] = [];
  const queries: string[] = [];
  const db = {
    async $queryRaw(query: Prisma.Sql | TemplateStringsArray) {
      const text = sqlText(query);
      queries.push(text);
      if (text.includes('expired_jobs AS')) return [{ id: claim.jobId }];
      if (text.includes('COUNT(*)'))
        return [{ total: 1n, pending: 0n, running: 0n, failed: 0n, canceled: 0n, interrupted: 1n }];
      return [];
    },
    async $executeRaw(query: Prisma.Sql) {
      writes.push(query);
      return 1;
    },
  };
  mockTransaction(t, db);
  const originalFindMany = prisma.restaurant.findMany;
  prisma.restaurant.findMany = (async () => [
    { id: claim.restaurantId },
  ]) as typeof originalFindMany;
  t.after(() => {
    prisma.restaurant.findMany = originalFindMany;
  });
  const provider = t.mock.method(generateImportedProductImageService, 'execute', async () =>
    assert.fail('provider must not be called'),
  );
  const reserve = t.mock.method(aiCreditService, 'reserve', async () =>
    assert.fail('must preserve existing reservations'),
  );
  const settle = t.mock.method(aiCreditService, 'settleReservation', async () =>
    assert.fail('must not charge again'),
  );
  const release = t.mock.method(aiCreditService, 'markReservation', async () =>
    assert.fail('must not release uncertain usage'),
  );

  assert.deepEqual(await drainAiImageJobs(), { processed: 0 });
  assert.equal(provider.mock.callCount(), 0);
  assert.equal(reserve.mock.callCount(), 0);
  assert.equal(settle.mock.callCount(), 0);
  assert.equal(release.mock.callCount(), 0);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].values[0], 'PARTIAL');
  assert.ok(
    queries.findIndex((query) => query.includes('expired_jobs AS')) <
      queries.findIndex((query) => query.includes('WITH candidate AS')),
  );
});

test('stale image claim cannot finish, add batch costs or clear the current lock', async (t) => {
  const db = {
    async $queryRaw() {
      return [];
    },
    async $executeRaw() {
      assert.fail('stale claim must not write');
    },
  };
  mockTransaction(t, db);
  assert.equal(await finishClaim(claim, { status: 'GENERATED' }, undefined, 0.009), false);
  assert.equal(await finishClaim(claim, {}, new Error('late provider failure')), false);
});

test('completion records batch cost only once and inside the owned-claim transaction', async (t) => {
  const writes: Prisma.Sql[] = [];
  let locked = true;
  const db = {
    async $queryRaw(query: Prisma.Sql | TemplateStringsArray) {
      const text = sqlText(query);
      if (text.includes('"lockToken" =')) return locked ? [{ id: claim.jobId }] : [];
      if (text.includes('COUNT(*)'))
        return [{ total: 1n, pending: 0n, running: 0n, failed: 0n, canceled: 0n, interrupted: 0n }];
      return [];
    },
    async $executeRaw(query: Prisma.Sql) {
      writes.push(query);
      if (query.sql.includes('"actualCreditUsd"')) locked = false;
      return 1;
    },
  };
  mockTransaction(t, db);
  assert.equal(await finishClaim(claim, { status: 'GENERATED' }, undefined, 0.009), true);
  assert.equal(await finishClaim(claim, { status: 'GENERATED' }, undefined, 0.009), false);
  assert.equal(writes.length, 3);
  const costWrites = writes.filter((query) => query.sql.includes('"actualCreditUsd"'));
  assert.equal(costWrites.length, 1);
  assert.equal(costWrites[0].values[0], 0.009);
  assert.ok(costWrites[0].values.includes(claim.lockToken));
});

test('a non-running or mismatched item cannot add cost or unlock the job', async (t) => {
  let writes = 0;
  const db = {
    async $queryRaw(query: Prisma.Sql | TemplateStringsArray) {
      return sqlText(query).includes('"lockToken" =') ? [{ id: claim.jobId }] : [];
    },
    async $executeRaw(query: Prisma.Sql) {
      writes += 1;
      assert.ok(query.sql.includes('UPDATE "RestaurantAiJobItem"'));
      return 0;
    },
  };
  mockTransaction(t, db);
  assert.equal(await finishClaim(claim, { status: 'GENERATED' }, undefined, 0.009), false);
  assert.equal(writes, 1);
});
