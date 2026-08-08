import prisma from "../../../config/prisma.js";

class DeliveryLocationCleanupJob {
  async execute() {
    const configuredDays = Number(
      process.env.DELIVERY_LOCATION_RETENTION_DAYS || 30,
    );
    const retentionDays = Number.isFinite(configuredDays)
      ? Math.min(Math.max(Math.floor(configuredDays), 1), 365)
      : 30;
    const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
    return prisma.deliveryLocation.deleteMany({
      where: { recordedAt: { lt: cutoff } },
    });
  }
}

export default new DeliveryLocationCleanupJob();
