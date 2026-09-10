-- Prisma persists application DateTime values as UTC. Preserve those instants
-- explicitly when upgrading the first sales-lead migration's naive timestamps.
ALTER TABLE "SalesLead"
  ALTER COLUMN "consentedAt" TYPE TIMESTAMPTZ(3) USING "consentedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

ALTER TABLE "SalesLeadEmailOutbox"
  ALTER COLUMN "availableAt" TYPE TIMESTAMPTZ(3) USING "availableAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "lockedUntil" TYPE TIMESTAMPTZ(3) USING "lockedUntil" AT TIME ZONE 'UTC',
  ALTER COLUMN "sentAt" TYPE TIMESTAMPTZ(3) USING "sentAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
