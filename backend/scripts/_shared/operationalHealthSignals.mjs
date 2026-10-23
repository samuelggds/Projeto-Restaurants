export function evaluateOperationalHealth(input, now = new Date()) {
  const age = (date) => date == null ? null : Math.max(0, Math.round((now.getTime() - new Date(date).getTime()) / 1000));
  const queue = input.queue;
  const jobs = input.jobs.map((job) => ({
    key: job.key,
    consecutiveFailures: job.consecutiveFailures,
    secondsSinceSuccess: age(job.lastCompletedAt),
    leaseExpired: job.leaseExpiresAt != null && new Date(job.leaseExpiresAt) < now,
    state: job.consecutiveFailures >= 3 ? 'critical' :
      job.consecutiveFailures > 0 ? 'warning' : 'ok',
  }));
  const signals = [
    { name: 'notification_outbox', state: queue.failed > 0 || (queue.oldestPendingSeconds ?? 0) > 900 ? 'critical' :
      queue.pending > 0 && (queue.oldestPendingSeconds ?? 0) > 300 ? 'warning' : 'ok',
      pending: queue.pending, failed: queue.failed, oldestPendingSeconds: queue.oldestPendingSeconds },
    { name: 'pending_pix_reconciliation', state: input.pixOlderThanFiveMinutes > 0 ? 'warning' : 'ok',
      eligibleOlderThanFiveMinutes: input.pixOlderThanFiveMinutes },
    { name: 'scheduled_jobs', state: jobs.some(j => j.state === 'critical') ? 'critical' :
      jobs.some(j => j.state === 'warning') ? 'warning' : 'ok',
      failedJobs: jobs.filter(j => j.state !== 'ok').length },
  ];
  return { measuredAt: now.toISOString(), signals, jobs };
}
