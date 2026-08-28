import prisma from '../../../config/prisma.js';

const DEFAULT_RETENTION_DAYS = 180;
const MINIMUM_RETENTION_DAYS = 90;
const MAXIMUM_RETENTION_DAYS = 3650;
const BATCH_SIZE = 1000;
const MAXIMUM_BATCHES_PER_RUN = 20;

export function normalizeAuditRetentionDays(value: unknown) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return DEFAULT_RETENTION_DAYS;
  return Math.min(Math.max(parsed, MINIMUM_RETENTION_DAYS), MAXIMUM_RETENTION_DAYS);
}

class AuditRetentionJob {
  async execute(now = new Date()) {
    const settings = await prisma.platformSettings.findUnique({
      where: { id: 1 },
      select: { auditRetentionDays: true },
    });
    const retentionDays = normalizeAuditRetentionDays(settings?.auditRetentionDays);
    const cutoff = new Date(now.getTime() - retentionDays * 86_400_000);
    let deletedCount = 0;

    // Lotes limitam o tempo de lock e evitam que uma base antiga monopolize o
    // worker. O lease executara novos lotes no proximo ciclo, se necessario.
    for (let batch = 0; batch < MAXIMUM_BATCHES_PER_RUN; batch += 1) {
      const candidates = await prisma.auditLog.findMany({
        where: { createdAt: { lt: cutoff } },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        select: { id: true },
      });

      if (candidates.length === 0) break;

      const deleted = await prisma.auditLog.deleteMany({
        where: { id: { in: candidates.map((item) => item.id) } },
      });
      deletedCount += deleted.count;

      if (candidates.length < BATCH_SIZE) break;
    }

    return { retentionDays, cutoff, deletedCount };
  }
}

export default new AuditRetentionJob();
