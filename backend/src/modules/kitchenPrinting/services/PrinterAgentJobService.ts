import { KitchenPrintJobStatus, Prisma } from '@prisma/client';

import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import type { AuthenticatedPrinterAgent } from './PrinterAgentAuthService.js';
import { logKitchenPrintingEvent } from './kitchenPrintingLog.js';

const DEFAULT_LEASE_SECONDS = 60;
const MAX_AUTOMATIC_ATTEMPTS = 5;

type ClaimedJob = {
  publicId: string;
  type: string;
  source: string;
  payloadVersion: number;
  payload: Prisma.JsonValue;
  paperWidth: string;
  copies: number;
  attempts: number;
  leaseExpiresAt: Date;
  createdAt: Date;
};

function sanitizePrinterError(value: string) {
  return value
    .replace(/pa_[0-9a-f-]{36}\.[A-Za-z0-9_-]+/giu, 'printer-agent-token:<redacted>')
    .replace(/Bearer\s+\S+/giu, 'Bearer <redacted>')
    .replace(/[\r\n\t]+/gu, ' ')
    .trim()
    .slice(0, 900);
}

class PrinterAgentJobService {
  async heartbeat(
    device: AuthenticatedPrinterAgent,
    input: { printerName?: string | null; appVersion?: string },
  ) {
    const previous = await prisma.printerAgentDevice.findFirst({
      where: { id: device.id, restaurantId: device.restaurantId, active: true },
      select: { lastSeenAt: true },
    });
    if (!previous) throw new Error('Agente não autorizado.');

    const now = new Date();
    const updated = await prisma.printerAgentDevice.updateMany({
      where: { id: device.id, restaurantId: device.restaurantId, active: true },
      data: {
        lastSeenAt: now,
        ...(input.printerName !== undefined ? { printerName: input.printerName } : {}),
        ...(input.appVersion ? { appVersion: input.appVersion } : {}),
      },
    });
    if (updated.count !== 1) throw new Error('Agente não autorizado.');

    if (!previous.lastSeenAt || now.getTime() - previous.lastSeenAt.getTime() > 90_000) {
      logKitchenPrintingEvent('PRINT_AGENT_ONLINE', {
        restaurantId: device.restaurantId,
        devicePublicId: device.publicId,
      });
    }
    return { ok: true, serverTime: now.toISOString() };
  }

  async claimNext(device: AuthenticatedPrinterAgent): Promise<ClaimedJob | null> {
    await this.heartbeat(device, {});
    return withTenantDbContext(device.restaurantId, async (db) => {
      await db.kitchenPrintJob.updateMany({
        where: {
          restaurantId: device.restaurantId,
          status: KitchenPrintJobStatus.PROCESSING,
          leaseExpiresAt: { lte: new Date() },
          attempts: { gte: MAX_AUTOMATIC_ATTEMPTS },
        },
        data: {
          status: KitchenPrintJobStatus.FAILED,
          leaseExpiresAt: null,
          lastError: 'Limite de tentativas atingido após expiração do lease.',
        },
      });

      const rows = await db.$queryRaw<ClaimedJob[]>(Prisma.sql`
        WITH candidate AS (
          SELECT "id"
          FROM "KitchenPrintJob"
          WHERE "restaurantId" = ${device.restaurantId}
            AND "attempts" < ${MAX_AUTOMATIC_ATTEMPTS}
            AND (
              (
                "status" IN (
                  CAST('PENDING' AS "KitchenPrintJobStatus"),
                  CAST('FAILED' AS "KitchenPrintJobStatus")
                )
                AND "availableAt" <= CURRENT_TIMESTAMP
              )
              OR (
                "status" = CAST('PROCESSING' AS "KitchenPrintJobStatus")
                AND "leaseExpiresAt" <= CURRENT_TIMESTAMP
              )
            )
          ORDER BY "availableAt" ASC, "createdAt" ASC, "id" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE "KitchenPrintJob" AS job
        SET
          "status" = CAST('PROCESSING' AS "KitchenPrintJobStatus"),
          "claimedAt" = CURRENT_TIMESTAMP,
          "leaseExpiresAt" = CURRENT_TIMESTAMP + (${DEFAULT_LEASE_SECONDS} * INTERVAL '1 second'),
          "claimedByDeviceId" = ${device.id},
          "attempts" = job."attempts" + 1,
          "lastError" = NULL,
          "updatedAt" = CURRENT_TIMESTAMP
        FROM candidate
        WHERE job."id" = candidate."id"
          AND job."restaurantId" = ${device.restaurantId}
        RETURNING
          job."publicId",
          job."type"::text,
          job."source"::text,
          job."payloadVersion",
          job."payload",
          job."paperWidth"::text,
          job."copies",
          job."attempts",
          job."leaseExpiresAt",
          job."createdAt"
      `);

      const job = rows[0] || null;
      if (job) {
        logKitchenPrintingEvent('PRINT_JOB_CLAIMED', {
          restaurantId: device.restaurantId,
          devicePublicId: device.publicId,
          jobPublicId: job.publicId,
          attempts: job.attempts,
        });
      }
      return job;
    });
  }

  async markPrinted(device: AuthenticatedPrinterAgent, jobPublicId: string) {
    return withTenantDbContext(device.restaurantId, async (db) => {
      const now = new Date();
      const updated = await db.kitchenPrintJob.updateMany({
        where: {
          publicId: jobPublicId,
          restaurantId: device.restaurantId,
          status: KitchenPrintJobStatus.PROCESSING,
          claimedByDeviceId: device.id,
        },
        data: {
          status: KitchenPrintJobStatus.PRINTED,
          printedAt: now,
          leaseExpiresAt: null,
          lastError: null,
        },
      });

      const current = await db.kitchenPrintJob.findFirst({
        where: { publicId: jobPublicId, restaurantId: device.restaurantId },
        select: {
          publicId: true,
          status: true,
          printedAt: true,
          claimedByDeviceId: true,
        },
      });
      if (
        !current ||
        current.claimedByDeviceId !== device.id ||
        (updated.count !== 1 && current.status !== KitchenPrintJobStatus.PRINTED)
      ) {
        throw new Error('Job não pertence ao lease atual deste agente.');
      }

      if (updated.count === 1) {
        logKitchenPrintingEvent('PRINT_JOB_PRINTED', {
          restaurantId: device.restaurantId,
          devicePublicId: device.publicId,
          jobPublicId,
        });
      }
      return {
        publicId: current.publicId,
        status: current.status,
        printedAt: current.printedAt,
        idempotent: updated.count === 0,
      };
    });
  }

  async markFailed(device: AuthenticatedPrinterAgent, jobPublicId: string, rawError: string) {
    const safeError = sanitizePrinterError(rawError) || 'Falha não especificada pelo agente.';
    return withTenantDbContext(device.restaurantId, async (db) => {
      const rows = await db.$queryRaw<
        Array<{ publicId: string; status: string; attempts: number; availableAt: Date }>
      >(Prisma.sql`
        UPDATE "KitchenPrintJob"
        SET
          "status" = CAST('FAILED' AS "KitchenPrintJobStatus"),
          "availableAt" = CURRENT_TIMESTAMP + (
            LEAST(300, 5 * POWER(2, GREATEST("attempts" - 1, 0))) * INTERVAL '1 second'
          ),
          "leaseExpiresAt" = NULL,
          "lastError" = ${safeError},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "publicId" = ${jobPublicId}
          AND "restaurantId" = ${device.restaurantId}
          AND "status" = CAST('PROCESSING' AS "KitchenPrintJobStatus")
          AND "claimedByDeviceId" = ${device.id}
        RETURNING "publicId", "status"::text, "attempts", "availableAt"
      `);

      if (!rows[0]) {
        const current = await db.kitchenPrintJob.findFirst({
          where: { publicId: jobPublicId, restaurantId: device.restaurantId },
          select: { status: true, claimedByDeviceId: true, attempts: true, availableAt: true },
        });
        if (
          current?.status === KitchenPrintJobStatus.FAILED &&
          current.claimedByDeviceId === device.id
        ) {
          return { publicId: jobPublicId, ...current, idempotent: true };
        }
        throw new Error('Job não pertence ao lease atual deste agente.');
      }

      logKitchenPrintingEvent('PRINT_JOB_FAILED', {
        restaurantId: device.restaurantId,
        devicePublicId: device.publicId,
        jobPublicId,
        attempts: rows[0].attempts,
        reason: safeError,
      });
      return { ...rows[0], idempotent: false };
    });
  }
}

export { DEFAULT_LEASE_SECONDS, MAX_AUTOMATIC_ATTEMPTS, sanitizePrinterError };
export default new PrinterAgentJobService();
