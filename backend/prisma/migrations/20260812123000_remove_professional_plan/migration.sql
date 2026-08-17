UPDATE "Subscription" SET "plan" = 'PREMIUM' WHERE "plan" = 'PROFISSIONAL';
UPDATE "Subscription" SET "scheduledPlan" = 'PREMIUM' WHERE "scheduledPlan" = 'PROFISSIONAL';

ALTER TABLE "Subscription" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "plan" TYPE TEXT;
ALTER TABLE "Subscription" ALTER COLUMN "scheduledPlan" TYPE TEXT;
DROP TYPE "PlanType";
CREATE TYPE "PlanType" AS ENUM ('BASICO', 'PREMIUM');
ALTER TABLE "Subscription"
  ALTER COLUMN "plan" TYPE "PlanType" USING ("plan"::"PlanType"),
  ALTER COLUMN "scheduledPlan" TYPE "PlanType" USING ("scheduledPlan"::"PlanType"),
  ALTER COLUMN "plan" SET DEFAULT 'BASICO';
