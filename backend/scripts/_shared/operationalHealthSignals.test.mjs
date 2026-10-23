import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateOperationalHealth } from './operationalHealthSignals.mjs';

const now = new Date('2026-10-23T12:00:00.000Z');
const base = { queue: { pending: 0, failed: 0, oldestPendingSeconds: null },
  pixOlderThanFiveMinutes: 0, jobs: [] };

test('healthy snapshot reports only aggregate counters', () => {
  const result = evaluateOperationalHealth(base, now);
  assert.deepEqual(result.signals.map(x => x.state), ['ok','ok','ok']);
  assert.equal(JSON.stringify(result).includes('payload'), false);
});

test('backlog, failed messages and job failures produce signals', () => {
  const result = evaluateOperationalHealth({ queue: { pending: 12, failed: 1, oldestPendingSeconds: 910 },
    pixOlderThanFiveMinutes: 3, jobs: [{ key: 'notifications.delivery', consecutiveFailures: 3,
      lastCompletedAt: null, leaseExpiresAt: null }] }, now);
  assert.deepEqual(result.signals.map(x => x.state), ['critical','warning','critical']);
  assert.equal(result.jobs[0].state, 'critical');
  assert.equal(result.jobs[0].secondsSinceSuccess, null);
});

test('warning thresholds preserve distinction from critical', () => {
  const result = evaluateOperationalHealth({ ...base, queue: { pending: 1, failed: 0, oldestPendingSeconds: 400 },
    jobs: [{ key: 'notifications.delivery', consecutiveFailures: 1,
      lastCompletedAt: '2026-10-23T11:59:00.000Z', leaseExpiresAt: null }] }, now);
  assert.equal(result.signals[0].state, 'warning');
  assert.equal(result.signals[2].state, 'warning');
  assert.equal(result.jobs[0].secondsSinceSuccess, 60);
});
