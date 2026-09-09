-- Infrastructure state is never exposed by public application routes.
CREATE TABLE "RuntimeRateLimit" (
  "key" VARCHAR(160) PRIMARY KEY,
  "totalHits" INTEGER NOT NULL CHECK ("totalHits" >= 0),
  "resetTime" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "RuntimeRateLimit_resetTime_idx" ON "RuntimeRateLimit" ("resetTime");

CREATE TABLE "RuntimeRealtimeEvent" (
  "id" BIGSERIAL PRIMARY KEY,
  "sourceId" UUID NOT NULL,
  "room" VARCHAR(200),
  "event" VARCHAR(120) NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RuntimeRealtimeEvent_payload_array" CHECK (jsonb_typeof("payload") = 'array')
);
CREATE INDEX "RuntimeRealtimeEvent_createdAt_idx" ON "RuntimeRealtimeEvent" ("createdAt");
