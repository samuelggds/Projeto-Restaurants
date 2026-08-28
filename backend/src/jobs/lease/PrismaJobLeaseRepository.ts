import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma.js';
import { safeErrorSummary } from '../../services/telemetrySanitizer.js';
import type {
  ClaimJobLeaseInput,
  CompleteJobLeaseInput,
  FailJobLeaseInput,
  JobLease,
  JobLeaseRepository,
  RenewJobLeaseInput,
} from './JobLeaseRepository.js';

const MAX_JOB_KEY_LENGTH = 191;
const MAX_OWNER_ID_LENGTH = 191;
const MAX_ERROR_LENGTH = 2000;
const MAX_LEASE_DURATION_MS = 24 * 60 * 60 * 1000;

interface JobLeaseRow {
  jobKey: string;
  ownerId: string;
  leaseVersion: bigint;
  leaseExpiresAt: Date;
}

export interface JobLeaseDatabase {
  $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>;
  $executeRaw(query: Prisma.Sql): Promise<number>;
}

function requireBoundedIdentifier(value: string, field: string, maximumLength: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength) {
    throw new TypeError(`${field} must contain between 1 and ${maximumLength} characters`);
  }
  return normalized;
}

function requireLeaseDuration(leaseDurationMs: number): number {
  if (
    !Number.isSafeInteger(leaseDurationMs) ||
    leaseDurationMs <= 0 ||
    leaseDurationMs > MAX_LEASE_DURATION_MS
  ) {
    throw new TypeError(
      `leaseDurationMs must be a positive integer no greater than ${MAX_LEASE_DURATION_MS}`,
    );
  }
  return leaseDurationMs;
}

function requireLease(lease: JobLease): JobLease {
  const jobKey = requireBoundedIdentifier(lease.jobKey, 'lease.jobKey', MAX_JOB_KEY_LENGTH);
  const ownerId = requireBoundedIdentifier(lease.ownerId, 'lease.ownerId', MAX_OWNER_ID_LENGTH);
  if (typeof lease.leaseVersion !== 'bigint' || lease.leaseVersion <= 0n) {
    throw new TypeError('lease.leaseVersion must be a positive bigint');
  }
  if (!(lease.leaseExpiresAt instanceof Date) || Number.isNaN(lease.leaseExpiresAt.getTime())) {
    throw new TypeError('lease.leaseExpiresAt must be a valid Date');
  }
  return { ...lease, jobKey, ownerId };
}

function requireNextRunAt(nextRunAt: Date): Date {
  if (!(nextRunAt instanceof Date) || Number.isNaN(nextRunAt.getTime())) {
    throw new TypeError('nextRunAt must be a valid Date');
  }
  return nextRunAt;
}

function errorSummary(error: unknown): string {
  return safeErrorSummary(error, MAX_ERROR_LENGTH);
}

function rowToLease(row: JobLeaseRow | undefined): JobLease | null {
  if (!row) return null;
  return {
    jobKey: row.jobKey,
    ownerId: row.ownerId,
    leaseVersion: row.leaseVersion,
    leaseExpiresAt: row.leaseExpiresAt,
  };
}

/**
 * PostgreSQL-backed lease repository.
 *
 * Every method is exactly one SQL statement. The repository deliberately does
 * not expose a transaction around job execution, so crashed workers release
 * ownership solely through the durable lease deadline.
 */
export class PrismaJobLeaseRepository implements JobLeaseRepository {
  constructor(private readonly db: JobLeaseDatabase = prisma) {}

  async claim(input: ClaimJobLeaseInput): Promise<JobLease | null> {
    const jobKey = requireBoundedIdentifier(input.jobKey, 'jobKey', MAX_JOB_KEY_LENGTH);
    const ownerId = requireBoundedIdentifier(input.ownerId, 'ownerId', MAX_OWNER_ID_LENGTH);
    const leaseDurationMs = requireLeaseDuration(input.leaseDurationMs);

    const rows = await this.db.$queryRaw<JobLeaseRow[]>(Prisma.sql`
      INSERT INTO "ScheduledJobState" (
        "jobKey",
        "ownerId",
        "leaseVersion",
        "leaseExpiresAt",
        "nextRunAt",
        "lastStartedAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${jobKey},
        ${ownerId},
        1,
        clock_timestamp() + (${leaseDurationMs} * INTERVAL '1 millisecond'),
        clock_timestamp(),
        clock_timestamp(),
        clock_timestamp(),
        clock_timestamp()
      )
      ON CONFLICT ("jobKey") DO UPDATE
      SET
        "ownerId" = EXCLUDED."ownerId",
        "leaseVersion" = "ScheduledJobState"."leaseVersion" + 1,
        "leaseExpiresAt" = clock_timestamp() + (${leaseDurationMs} * INTERVAL '1 millisecond'),
        "lastStartedAt" = clock_timestamp(),
        "updatedAt" = clock_timestamp()
      WHERE
        "ScheduledJobState"."nextRunAt" <= clock_timestamp()
        AND (
          "ScheduledJobState"."leaseExpiresAt" IS NULL
          OR "ScheduledJobState"."leaseExpiresAt" <= clock_timestamp()
        )
      RETURNING "jobKey", "ownerId", "leaseVersion", "leaseExpiresAt"
    `);

    return rowToLease(rows[0]);
  }

  async renew(input: RenewJobLeaseInput): Promise<JobLease | null> {
    const lease = requireLease(input.lease);
    const leaseDurationMs = requireLeaseDuration(input.leaseDurationMs);

    const rows = await this.db.$queryRaw<JobLeaseRow[]>(Prisma.sql`
      UPDATE "ScheduledJobState"
      SET
        "leaseExpiresAt" = clock_timestamp() + (${leaseDurationMs} * INTERVAL '1 millisecond'),
        "updatedAt" = clock_timestamp()
      WHERE
        "jobKey" = ${lease.jobKey}
        AND "ownerId" = ${lease.ownerId}
        AND "leaseVersion" = ${lease.leaseVersion}
        AND "leaseExpiresAt" > clock_timestamp()
      RETURNING "jobKey", "ownerId", "leaseVersion", "leaseExpiresAt"
    `);

    return rowToLease(rows[0]);
  }

  async complete(input: CompleteJobLeaseInput): Promise<boolean> {
    const lease = requireLease(input.lease);
    const nextRunAt = requireNextRunAt(input.nextRunAt);

    const updated = await this.db.$executeRaw(Prisma.sql`
      UPDATE "ScheduledJobState"
      SET
        "ownerId" = NULL,
        "leaseExpiresAt" = NULL,
        "nextRunAt" = ${nextRunAt},
        "lastCompletedAt" = clock_timestamp(),
        "lastError" = NULL,
        "consecutiveFailures" = 0,
        "updatedAt" = clock_timestamp()
      WHERE
        "jobKey" = ${lease.jobKey}
        AND "ownerId" = ${lease.ownerId}
        AND "leaseVersion" = ${lease.leaseVersion}
    `);

    return updated === 1;
  }

  async fail(input: FailJobLeaseInput): Promise<boolean> {
    const lease = requireLease(input.lease);
    const nextRunAt = requireNextRunAt(input.nextRunAt);
    const lastError = errorSummary(input.error);

    const updated = await this.db.$executeRaw(Prisma.sql`
      UPDATE "ScheduledJobState"
      SET
        "ownerId" = NULL,
        "leaseExpiresAt" = NULL,
        "nextRunAt" = ${nextRunAt},
        "lastFailedAt" = clock_timestamp(),
        "lastError" = ${lastError},
        "consecutiveFailures" = "consecutiveFailures" + 1,
        "updatedAt" = clock_timestamp()
      WHERE
        "jobKey" = ${lease.jobKey}
        AND "ownerId" = ${lease.ownerId}
        AND "leaseVersion" = ${lease.leaseVersion}
    `);

    return updated === 1;
  }
}

export const prismaJobLeaseRepository = new PrismaJobLeaseRepository();
