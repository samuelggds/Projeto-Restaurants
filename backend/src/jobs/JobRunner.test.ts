import assert from 'node:assert/strict';
import test from 'node:test';
import type { JobDefinition } from './JobDefinition.js';
import { JobRunner } from './JobRunner.js';
import type {
  CompleteJobLeaseInput,
  FailJobLeaseInput,
  JobLease,
  JobLeaseRepository,
} from './lease/JobLeaseRepository.js';

const lease: JobLease = {
  jobKey: 'test.job',
  ownerId: 'worker-1',
  leaseVersion: 1n,
  leaseExpiresAt: new Date(Date.now() + 60_000),
};

function definition(execute: () => Promise<unknown>): JobDefinition {
  return {
    key: 'test.job',
    description: 'Test job',
    runtime: 'worker',
    schedule: { kind: 'interval', intervalMs: 10_000 },
    leaseDurationMs: 60_000,
    successCooldownMs: 20_000,
    failureBackoffMs: 5_000,
    execute,
  };
}

function fakeRepository(overrides: Partial<JobLeaseRepository> = {}) {
  const completed: CompleteJobLeaseInput[] = [];
  const failed: FailJobLeaseInput[] = [];
  const repository: JobLeaseRepository = {
    async claim() {
      return lease;
    },
    async renew() {
      return lease;
    },
    async complete(input) {
      completed.push(input);
      return true;
    },
    async fail(input) {
      failed.push(input);
      return true;
    },
    ...overrides,
  };
  return { repository, completed, failed };
}

const silentLogger = { info() {}, warn() {}, error() {} };

test('executa uma vez e persiste cooldown somente após sucesso', async () => {
  const { repository, completed, failed } = fakeRepository();
  let executions = 0;
  const before = Date.now();
  const runner = new JobRunner(repository, 'worker-1', silentLogger);
  const result = await runner.run(
    definition(async () => {
      executions += 1;
    }),
  );

  assert.equal(result.status, 'completed');
  assert.equal(executions, 1);
  assert.equal(completed.length, 1);
  assert.equal(failed.length, 0);
  assert.ok(completed[0].nextRunAt.getTime() >= before + 20_000);
});

test('não executa quando outra réplica possui o lease', async () => {
  const { repository } = fakeRepository({ claim: async () => null });
  let executed = false;
  const result = await new JobRunner(repository, 'worker-2', silentLogger).run(
    definition(async () => {
      executed = true;
    }),
  );

  assert.equal(result.status, 'skipped');
  assert.equal(executed, false);
});

test('falha agenda backoff e registra o erro pelo fencing token', async () => {
  const { repository, completed, failed } = fakeRepository();
  const before = Date.now();
  const result = await new JobRunner(repository, 'worker-1', silentLogger).run(
    definition(async () => {
      throw new Error('boom');
    }),
  );

  assert.equal(result.status, 'failed');
  assert.equal(completed.length, 0);
  assert.equal(failed.length, 1);
  assert.equal(failed[0].lease, lease);
  assert.match(String(failed[0].error), /boom/u);
  assert.ok(failed[0].nextRunAt.getTime() >= before + 5_000);
});

test('rejeição do fencing token é tratada como lease perdido', async () => {
  const { repository } = fakeRepository({ complete: async () => false });
  const result = await new JobRunner(repository, 'worker-old', silentLogger).run(
    definition(async () => undefined),
  );
  assert.equal(result.status, 'lease-lost');
});
