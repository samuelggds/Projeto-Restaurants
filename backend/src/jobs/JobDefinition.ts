export type CronJobSchedule = {
  kind: 'cron';
  expression: string;
  timezone: string;
};

export type IntervalJobSchedule = {
  kind: 'interval';
  intervalMs: number;
};

export type JobSchedule = CronJobSchedule | IntervalJobSchedule;

export type JobDefinition = {
  key: string;
  description: string;
  runtime: 'api' | 'worker';
  schedule: JobSchedule;
  leaseDurationMs: number;
  successCooldownMs: number;
  failureBackoffMs: number;
  runOnStart?: boolean;
  execute(): Promise<unknown>;
};
