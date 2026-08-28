import type { JobDefinition } from './JobDefinition.js';
import type { JobLease, JobLeaseRepository } from './lease/JobLeaseRepository.js';

export type JobRunResult = {
  key: string;
  status: 'completed' | 'failed' | 'skipped' | 'lease-lost';
};

type Logger = Pick<Console, 'info' | 'warn' | 'error'>;

export class JobRunner {
  constructor(
    private readonly leaseRepository: JobLeaseRepository,
    private readonly ownerId: string,
    private readonly logger: Logger = console,
  ) {}

  async run(definition: JobDefinition): Promise<JobRunResult> {
    let lease = await this.leaseRepository.claim({
      jobKey: definition.key,
      ownerId: this.ownerId,
      leaseDurationMs: definition.leaseDurationMs,
    });
    if (!lease) {
      return { key: definition.key, status: 'skipped' };
    }

    let leaseLost = false;
    let renewal: Promise<void> | null = null;
    const heartbeatIntervalMs = Math.max(1_000, Math.floor(definition.leaseDurationMs / 3));
    const heartbeat = setInterval(() => {
      if (renewal || leaseLost) return;
      renewal = this.renewLease(lease, definition.leaseDurationMs)
        .then((renewed) => {
          if (!renewed) {
            leaseLost = true;
            this.logger.warn('[JOB_LEASE_LOST]', { jobKey: definition.key });
            return;
          }
          lease = renewed;
        })
        .catch((error) => {
          leaseLost = true;
          this.logger.error('[JOB_LEASE_RENEW_FAILED]', {
            jobKey: definition.key,
            error: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
          });
        })
        .finally(() => {
          renewal = null;
        });
    }, heartbeatIntervalMs);
    heartbeat.unref();

    this.logger.info('[JOB_STARTED]', { jobKey: definition.key });
    try {
      await definition.execute();
      clearInterval(heartbeat);
      if (renewal) await renewal;
      if (leaseLost) return { key: definition.key, status: 'lease-lost' };

      const completed = await this.leaseRepository.complete({
        lease,
        nextRunAt: new Date(Date.now() + definition.successCooldownMs),
      });
      if (!completed) {
        this.logger.warn('[JOB_COMPLETION_FENCE_REJECTED]', { jobKey: definition.key });
        return { key: definition.key, status: 'lease-lost' };
      }

      this.logger.info('[JOB_COMPLETED]', { jobKey: definition.key });
      return { key: definition.key, status: 'completed' };
    } catch (error) {
      clearInterval(heartbeat);
      if (renewal) await renewal;
      if (leaseLost) return { key: definition.key, status: 'lease-lost' };

      const failed = await this.leaseRepository.fail({
        lease,
        nextRunAt: new Date(Date.now() + definition.failureBackoffMs),
        error,
      });
      this.logger.error('[JOB_FAILED]', {
        jobKey: definition.key,
        recorded: failed,
        error: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      });
      return { key: definition.key, status: failed ? 'failed' : 'lease-lost' };
    }
  }

  private renewLease(lease: JobLease, leaseDurationMs: number) {
    return this.leaseRepository.renew({ lease, leaseDurationMs });
  }
}
