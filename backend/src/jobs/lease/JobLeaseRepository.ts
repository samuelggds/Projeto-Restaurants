export interface JobLease {
  jobKey: string;
  ownerId: string;
  leaseVersion: bigint;
  leaseExpiresAt: Date;
}

export interface ClaimJobLeaseInput {
  jobKey: string;
  ownerId: string;
  leaseDurationMs: number;
}

export interface RenewJobLeaseInput {
  lease: JobLease;
  leaseDurationMs: number;
}

export interface CompleteJobLeaseInput {
  lease: JobLease;
  nextRunAt: Date;
}

export interface FailJobLeaseInput extends CompleteJobLeaseInput {
  error: unknown;
}

/**
 * A lease token is a fencing token. Callers must keep the exact owner/version
 * returned by claim and must never reconstruct it from job configuration.
 */
export interface JobLeaseRepository {
  claim(input: ClaimJobLeaseInput): Promise<JobLease | null>;
  renew(input: RenewJobLeaseInput): Promise<JobLease | null>;
  complete(input: CompleteJobLeaseInput): Promise<boolean>;
  fail(input: FailJobLeaseInput): Promise<boolean>;
}
