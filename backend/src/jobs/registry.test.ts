import assert from 'node:assert/strict';
import test from 'node:test';
import cron from 'node-cron';
import { createJobDefinitions } from './registry.js';

test('registro possui chaves únicas e agendas válidas', () => {
  const jobs = createJobDefinitions({});
  assert.equal(jobs.length, 6);
  assert.equal(new Set(jobs.map((job) => job.key)).size, jobs.length);
  assert.equal(jobs.filter((job) => job.runtime === 'worker').length, 5);
  assert.deepEqual(
    jobs.filter((job) => job.runtime === 'api').map((job) => job.key),
    ['table-account.payment-expiration'],
  );

  for (const job of jobs) {
    assert.ok(job.leaseDurationMs > 0);
    assert.ok(job.successCooldownMs > 0);
    assert.ok(job.failureBackoffMs > 0);
    if (job.schedule.kind === 'cron') {
      assert.equal(cron.validate(job.schedule.expression), true, job.key);
    } else {
      assert.ok(job.schedule.intervalMs >= 10_000, job.key);
    }
  }
});

test('intervalo de expiração de mesa é validado e limita configuração perigosa', () => {
  assert.throws(
    () => createJobDefinitions({ TABLE_PAYMENT_EXPIRATION_INTERVAL_MS: '1000' }),
    /TABLE_PAYMENT_EXPIRATION_INTERVAL_MS/u,
  );
  assert.throws(
    () => createJobDefinitions({ TABLE_PAYMENT_EXPIRATION_INTERVAL_MS: 'not-a-number' }),
    /TABLE_PAYMENT_EXPIRATION_INTERVAL_MS/u,
  );
});

test('expressões configuráveis permanecem visíveis para validação no startup do worker', () => {
  const jobs = createJobDefinitions({ BILLING_MP_RECONCILE_CRON: 'invalid cron' });
  const reconciliation = jobs.find((job) => job.key === 'billing.mercado-pago-reconciliation');
  assert.equal(reconciliation?.schedule.kind, 'cron');
  if (reconciliation?.schedule.kind === 'cron') {
    assert.equal(cron.validate(reconciliation.schedule.expression), false);
  }
});
