import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import type { JobDefinition } from './JobDefinition.js';
import type { JobRunResult } from './JobRunner.js';

type JobRunnerLike = {
  run(definition: JobDefinition): Promise<JobRunResult>;
};

type Logger = Pick<Console, 'error'>;

export function validateJobDefinitions(definitions: JobDefinition[]) {
  const keys = new Set<string>();
  for (const definition of definitions) {
    if (!definition.key.trim() || keys.has(definition.key)) {
      throw new Error(`Job duplicado ou sem chave: ${definition.key || '(vazio)'}.`);
    }
    keys.add(definition.key);
    if (definition.schedule.kind === 'cron') {
      if (!cron.validate(definition.schedule.expression)) {
        throw new Error(`Expressão cron inválida para ${definition.key}.`);
      }
    } else if (
      !Number.isSafeInteger(definition.schedule.intervalMs) ||
      definition.schedule.intervalMs < 10_000
    ) {
      throw new Error(`Intervalo inválido para ${definition.key}.`);
    }
  }
}

export class WorkerScheduler {
  private readonly cronTasks: ScheduledTask[] = [];
  private readonly intervalTimers: NodeJS.Timeout[] = [];
  private readonly activeExecutions = new Set<Promise<JobRunResult>>();
  private readonly activeKeys = new Set<string>();
  private started = false;
  private stopping = false;

  constructor(
    private readonly definitions: JobDefinition[],
    private readonly runner: JobRunnerLike,
    private readonly logger: Logger = console,
  ) {}

  start() {
    if (this.started) return;
    validateJobDefinitions(this.definitions);
    this.started = true;

    for (const definition of this.definitions) {
      if (definition.schedule.kind === 'cron') {
        const task = cron.schedule(
          definition.schedule.expression,
          () => this.dispatch(definition),
          {
            timezone: definition.schedule.timezone,
            noOverlap: true,
          },
        );
        this.cronTasks.push(task);
      } else {
        const timer = setInterval(
          () => void this.dispatch(definition),
          definition.schedule.intervalMs,
        );
        timer.unref();
        this.intervalTimers.push(timer);
      }

      if (definition.runOnStart) void this.dispatch(definition);
    }
  }

  async stop() {
    if (this.stopping) return;
    this.stopping = true;
    for (const task of this.cronTasks.splice(0)) {
      task.stop();
      task.destroy();
    }
    for (const timer of this.intervalTimers.splice(0)) clearInterval(timer);
    await Promise.allSettled([...this.activeExecutions]);
  }

  async runNow(jobKey: string) {
    const definition = this.definitions.find((job) => job.key === jobKey);
    if (!definition) throw new Error(`Job desconhecido: ${jobKey}.`);
    return this.dispatch(definition);
  }

  private dispatch(definition: JobDefinition) {
    if (this.stopping || this.activeKeys.has(definition.key)) {
      return Promise.resolve<JobRunResult>({ key: definition.key, status: 'skipped' });
    }

    this.activeKeys.add(definition.key);
    const execution = this.runner
      .run(definition)
      .catch((error) => {
        this.logger.error('[JOB_DISPATCH_FAILED]', {
          jobKey: definition.key,
          error: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
        });
        return { key: definition.key, status: 'failed' } as JobRunResult;
      })
      .finally(() => {
        this.activeKeys.delete(definition.key);
        this.activeExecutions.delete(execution);
      });
    this.activeExecutions.add(execution);
    return execution;
  }
}
