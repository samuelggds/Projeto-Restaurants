import assert from 'node:assert/strict';
import test from 'node:test';
import type { JobDefinition } from './JobDefinition.js';
import type { JobRunResult } from './JobRunner.js';
import { validateJobDefinitions, WorkerScheduler } from './WorkerScheduler.js';

function job(key = 'test.job'): JobDefinition {
  return {
    key,
    description: key,
    runtime: 'worker',
    schedule: { kind: 'interval', intervalMs: 10_000 },
    leaseDurationMs: 60_000,
    successCooldownMs: 10_000,
    failureBackoffMs: 10_000,
    execute: async () => undefined,
  };
}

test('validação rejeita chaves duplicadas, cron e intervalos inválidos', () => {
  assert.throws(() => validateJobDefinitions([job(), job()]), /duplicado/u);
  assert.throws(
    () =>
      validateJobDefinitions([
        { ...job(), schedule: { kind: 'cron', expression: 'invalid', timezone: 'UTC' } },
      ]),
    /cron inválida/u,
  );
  assert.throws(
    () => validateJobDefinitions([{ ...job(), schedule: { kind: 'interval', intervalMs: 1 } }]),
    /Intervalo inválido/u,
  );
});

test('runNow evita sobreposição local e stop aguarda execução ativa', async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const runner = {
    async run(definition: JobDefinition): Promise<JobRunResult> {
      calls += 1;
      await blocked;
      return { key: definition.key, status: 'completed' };
    },
  };
  const scheduler = new WorkerScheduler([job()], runner);
  const first = scheduler.runNow('test.job');
  const overlapping = await scheduler.runNow('test.job');
  assert.equal(overlapping.status, 'skipped');
  assert.equal(calls, 1);

  const stopping = scheduler.stop();
  let stopped = false;
  void stopping.then(() => {
    stopped = true;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(stopped, false);

  release();
  assert.equal((await first).status, 'completed');
  await stopping;
  assert.equal(stopped, true);
});

test('runNow rejeita chave desconhecida', async () => {
  const scheduler = new WorkerScheduler([], {
    async run() {
      throw new Error('não deveria executar');
    },
  });
  await assert.rejects(() => scheduler.runNow('missing'), /desconhecido/u);
});

test('falha de infraestrutura é contida para permitir retry no próximo gatilho', async () => {
  const errors: unknown[][] = [];
  const scheduler = new WorkerScheduler(
    [job()],
    {
      async run() {
        throw new Error('database unavailable');
      },
    },
    { error: (...args) => errors.push(args) },
  );

  const result = await scheduler.runNow('test.job');
  assert.equal(result.status, 'failed');
  assert.equal(errors.length, 1);
  assert.deepEqual(errors[0][1], { jobKey: 'test.job', error: 'Error' });
});
