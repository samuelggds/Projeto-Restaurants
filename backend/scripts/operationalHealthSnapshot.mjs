import './_shared/guardSensitiveRead.mjs';
import { PrismaClient } from '@prisma/client';
import { evaluateOperationalHealth } from './_shared/operationalHealthSignals.mjs';

// Explicit opt-in command, read-only aggregates only; never used by API or worker.
const prisma = new PrismaClient();
try {
  const [queue] = await prisma.$queryRaw`
    SELECT count(*) FILTER (WHERE "status"='PENDING')::int AS pending,
           count(*) FILTER (WHERE "status"='FAILED')::int AS failed,
           extract(epoch FROM (clock_timestamp() - min("createdAt") FILTER (WHERE "status"='PENDING')))::int AS "oldestPendingSeconds"
    FROM "NotificationOutbox"
  `;
  const [pix] = await prisma.$queryRaw`
    SELECT count(*)::int AS count FROM "Order"
    WHERE "status"='PENDENTE' AND "paid"=false AND "payOnDelivery"=false
      AND "paymentMethod"='PIX' AND "pixPaymentId" IS NOT NULL
      AND "createdAt" < clock_timestamp() - interval '5 minutes'
      AND "pixExpiresAt" > clock_timestamp()
  `;
  const jobs = await prisma.scheduledJobState.findMany({
    select: { jobKey: true, consecutiveFailures: true, lastCompletedAt: true, leaseExpiresAt: true },
  });
  const report = evaluateOperationalHealth({
    queue: { pending: queue.pending, failed: queue.failed, oldestPendingSeconds: queue.oldestPendingSeconds },
    pixOlderThanFiveMinutes: pix.count,
    jobs: jobs.map(j => ({ key: j.jobKey, consecutiveFailures: j.consecutiveFailures,
      lastCompletedAt: j.lastCompletedAt, leaseExpiresAt: j.leaseExpiresAt })),
  });
  console.log(JSON.stringify(report));
} catch {
  console.error('Operational health snapshot failed; no customer data was printed.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
