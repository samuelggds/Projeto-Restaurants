CREATE TABLE "ScheduledJobState" (
    "jobKey" VARCHAR(191) NOT NULL,
    "ownerId" VARCHAR(191),
    "leaseVersion" BIGINT NOT NULL DEFAULT 0,
    "leaseExpiresAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastStartedAt" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "lastError" VARCHAR(2000),
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledJobState_pkey" PRIMARY KEY ("jobKey")
);

CREATE INDEX "ScheduledJobState_nextRunAt_leaseExpiresAt_idx"
ON "ScheduledJobState"("nextRunAt", "leaseExpiresAt");

CREATE INDEX "ScheduledJobState_leaseExpiresAt_idx"
ON "ScheduledJobState"("leaseExpiresAt");

CREATE INDEX "ScheduledJobState_ownerId_leaseVersion_idx"
ON "ScheduledJobState"("ownerId", "leaseVersion");
