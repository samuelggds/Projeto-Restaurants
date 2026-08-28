import assert from 'node:assert/strict';
import test from 'node:test';
import type { Prisma } from '@prisma/client';
import { PrismaJobLeaseRepository, type JobLeaseDatabase } from './PrismaJobLeaseRepository.js';
import type { JobLease } from './JobLeaseRepository.js';

interface CapturedQuery {
  sql: string;
  values: unknown[];
}

class FakeJobLeaseDatabase implements JobLeaseDatabase {
  readonly queried: CapturedQuery[] = [];
  readonly executed: CapturedQuery[] = [];
  queryResults: unknown[][] = [];
  executeResults: number[] = [];

  async $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T> {
    this.queried.push(capture(query));
    return (this.queryResults.shift() ?? []) as T;
  }

  async $executeRaw(query: Prisma.Sql): Promise<number> {
    this.executed.push(capture(query));
    return this.executeResults.shift() ?? 0;
  }
}

function capture(query: Prisma.Sql): CapturedQuery {
  return {
    sql: query.sql.replace(/\s+/g, ' ').trim(),
    values: [...query.values],
  };
}

function lease(overrides: Partial<JobLease> = {}): JobLease {
  return {
    jobKey: 'billing.daily',
    ownerId: 'worker-a',
    leaseVersion: 7n,
    leaseExpiresAt: new Date('2026-08-27T18:05:00.000Z'),
    ...overrides,
  };
}

test('claim é um upsert atômico condicionado ao relógio do PostgreSQL', async () => {
  const db = new FakeJobLeaseDatabase();
  db.queryResults.push([
    {
      jobKey: 'billing.daily',
      ownerId: 'worker-a',
      leaseVersion: 8n,
      leaseExpiresAt: new Date('2026-08-27T18:05:00.000Z'),
    },
  ]);
  const repository = new PrismaJobLeaseRepository(db);

  const claimed = await repository.claim({
    jobKey: ' billing.daily ',
    ownerId: ' worker-a ',
    leaseDurationMs: 60_000,
  });

  assert.deepEqual(claimed, lease({ leaseVersion: 8n }));
  assert.equal(db.queried.length, 1);
  assert.equal(db.executed.length, 0);
  const query = db.queried[0];
  assert.match(query.sql, /INSERT INTO "ScheduledJobState"/);
  assert.match(query.sql, /ON CONFLICT \("jobKey"\) DO UPDATE/);
  assert.match(query.sql, /"leaseVersion" = "ScheduledJobState"\."leaseVersion" \+ 1/);
  assert.match(query.sql, /"nextRunAt" <= clock_timestamp\(\)/);
  assert.match(query.sql, /"leaseExpiresAt" <= clock_timestamp\(\)/);
  assert.match(query.sql, /INTERVAL '1 millisecond'/);
  assert.deepEqual(query.values, ['billing.daily', 'worker-a', 60_000, 60_000]);
});

test('claim retorna null quando outro worker mantém lease ou cooldown ativo', async () => {
  const db = new FakeJobLeaseDatabase();
  db.queryResults.push([]);
  const repository = new PrismaJobLeaseRepository(db);

  const claimed = await repository.claim({
    jobKey: 'billing.daily',
    ownerId: 'worker-b',
    leaseDurationMs: 30_000,
  });

  assert.equal(claimed, null);
});

test('renew exige lease ainda vigente e usa owner mais versão como fencing', async () => {
  const db = new FakeJobLeaseDatabase();
  const renewedLease = lease({ leaseExpiresAt: new Date('2026-08-27T18:06:00.000Z') });
  db.queryResults.push([renewedLease]);
  const repository = new PrismaJobLeaseRepository(db);

  const renewed = await repository.renew({ lease: lease(), leaseDurationMs: 120_000 });

  assert.deepEqual(renewed, renewedLease);
  const query = db.queried[0];
  assert.match(query.sql, /UPDATE "ScheduledJobState"/);
  assert.match(query.sql, /"leaseExpiresAt" > clock_timestamp\(\)/);
  assert.match(query.sql, /"jobKey" = \?/);
  assert.match(query.sql, /"ownerId" = \?/);
  assert.match(query.sql, /"leaseVersion" = \?/);
  assert.deepEqual(query.values, [120_000, 'billing.daily', 'worker-a', 7n]);
});

test('renew retorna null para token expirado, substituído ou de outro owner', async () => {
  const db = new FakeJobLeaseDatabase();
  db.queryResults.push([]);
  const repository = new PrismaJobLeaseRepository(db);

  assert.equal(await repository.renew({ lease: lease(), leaseDurationMs: 15_000 }), null);
});

test('complete agenda a próxima execução durável e libera o lease cercado', async () => {
  const db = new FakeJobLeaseDatabase();
  db.executeResults.push(1, 0);
  const repository = new PrismaJobLeaseRepository(db);
  const nextRunAt = new Date('2026-08-28T03:00:00.000Z');

  assert.equal(await repository.complete({ lease: lease(), nextRunAt }), true);
  assert.equal(await repository.complete({ lease: lease(), nextRunAt }), false);

  const query = db.executed[0];
  assert.match(query.sql, /"ownerId" = NULL/);
  assert.match(query.sql, /"leaseExpiresAt" = NULL/);
  assert.match(query.sql, /"nextRunAt" = \?/);
  assert.match(query.sql, /"lastCompletedAt" = clock_timestamp\(\)/);
  assert.match(query.sql, /"consecutiveFailures" = 0/);
  assert.deepEqual(query.values, [nextRunAt, 'billing.daily', 'worker-a', 7n]);
});

test('fail registra erro limitado, backoff durável e preserva fencing', async () => {
  const db = new FakeJobLeaseDatabase();
  db.executeResults.push(1);
  const repository = new PrismaJobLeaseRepository(db);
  const nextRunAt = new Date('2026-08-27T18:10:00.000Z');
  const longMessage = 'x'.repeat(2500);

  assert.equal(
    await repository.fail({ lease: lease(), nextRunAt, error: new Error(longMessage) }),
    true,
  );

  const query = db.executed[0];
  const lastError = String(query.values[1]);
  assert.match(query.sql, /"lastFailedAt" = clock_timestamp\(\)/);
  assert.match(query.sql, /"consecutiveFailures" = "consecutiveFailures" \+ 1/);
  assert.equal(lastError.length, 2000);
  assert.match(lastError, /^Error: x+\[TRUNCATED\]$/u);
  assert.deepEqual(query.values.slice(2), ['billing.daily', 'worker-a', 7n]);
});

test('valida identificadores, duração, datas e versão antes de consultar o banco', async () => {
  const db = new FakeJobLeaseDatabase();
  const repository = new PrismaJobLeaseRepository(db);

  await assert.rejects(
    repository.claim({ jobKey: '', ownerId: 'worker', leaseDurationMs: 1000 }),
    /jobKey/,
  );
  await assert.rejects(
    repository.claim({ jobKey: 'job', ownerId: 'worker', leaseDurationMs: 0 }),
    /leaseDurationMs/,
  );
  await assert.rejects(
    repository.renew({
      lease: lease({ leaseVersion: 0n }),
      leaseDurationMs: 1000,
    }),
    /leaseVersion/,
  );
  await assert.rejects(
    repository.complete({ lease: lease(), nextRunAt: new Date(Number.NaN) }),
    /nextRunAt/,
  );
  assert.equal(db.queried.length, 0);
  assert.equal(db.executed.length, 0);
});
