-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "planChangeLockedUntil" TIMESTAMP(3),
ADD COLUMN     "scheduledPlan" "PlanType",
ADD COLUMN     "scheduledPlanEffectiveMonth" INTEGER,
ADD COLUMN     "scheduledPlanEffectiveYear" INTEGER;
