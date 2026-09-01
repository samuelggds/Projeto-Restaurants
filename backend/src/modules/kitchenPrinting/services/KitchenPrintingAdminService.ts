import { randomUUID } from 'node:crypto';
import {
  KitchenPrintJobStatus,
  PrinterAutoPrintTrigger,
  PrinterPaperWidth,
  Prisma,
} from '@prisma/client';

import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import type { UpdatePrinterSettingsInput } from '../domain/kitchenPrintingSchemas.js';
import { createPrinterAgentCredential } from '../security/printerAgentToken.js';
import kitchenPrintingService from './KitchenPrintingService.js';

const AGENT_ONLINE_WINDOW_MS = 90_000;

function normalizeTenantId(restaurantId: number | null | undefined) {
  const value = Number(restaurantId);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Restaurante não identificado.');
  return value;
}

class KitchenPrintingAdminService {
  async getConfiguration(restaurantIdInput: number | null | undefined) {
    const restaurantId = normalizeTenantId(restaurantIdInput);
    const now = Date.now();
    return withTenantDbContext(restaurantId, async (db) => {
      const [settings, device, queue] = await Promise.all([
        db.restaurantPrinterSettings.findUnique({ where: { restaurantId } }),
        db.printerAgentDevice.findFirst({
          where: { restaurantId, active: true },
          orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }],
          select: {
            publicId: true,
            name: true,
            printerName: true,
            lastSeenAt: true,
            appVersion: true,
          },
        }),
        db.kitchenPrintJob.groupBy({
          by: ['status'],
          where: { restaurantId },
          _count: { _all: true },
        }),
      ]);

      return {
        settings: settings || {
          enabled: false,
          autoPrintEnabled: false,
          autoPrintTrigger: PrinterAutoPrintTrigger.NEW_ORDER,
          paperWidth: PrinterPaperWidth.MM80,
          copies: 1,
        },
        agent: device
          ? {
              ...device,
              online: Boolean(
                device.lastSeenAt && now - device.lastSeenAt.getTime() <= AGENT_ONLINE_WINDOW_MS,
              ),
            }
          : null,
        queue: Object.fromEntries(queue.map((row) => [row.status, row._count._all])),
        onlineWindowSeconds: AGENT_ONLINE_WINDOW_MS / 1000,
      };
    });
  }

  async updateSettings(
    restaurantIdInput: number | null | undefined,
    input: UpdatePrinterSettingsInput,
  ) {
    const restaurantId = normalizeTenantId(restaurantIdInput);
    const data: Prisma.RestaurantPrinterSettingsUncheckedUpdateInput = {
      ...(typeof input.enabled === 'boolean' ? { enabled: input.enabled } : {}),
      ...(typeof input.autoPrintEnabled === 'boolean'
        ? { autoPrintEnabled: input.autoPrintEnabled }
        : {}),
      ...(input.autoPrintTrigger
        ? { autoPrintTrigger: input.autoPrintTrigger as PrinterAutoPrintTrigger }
        : {}),
      ...(input.paperWidth ? { paperWidth: input.paperWidth as PrinterPaperWidth } : {}),
      ...(input.copies ? { copies: input.copies } : {}),
    };

    return withTenantDbContext(restaurantId, (db) =>
      db.restaurantPrinterSettings.upsert({
        where: { restaurantId },
        update: data,
        create: {
          restaurantId,
          enabled: input.enabled ?? false,
          autoPrintEnabled: input.autoPrintEnabled ?? false,
          autoPrintTrigger:
            (input.autoPrintTrigger as PrinterAutoPrintTrigger | undefined) ??
            PrinterAutoPrintTrigger.NEW_ORDER,
          paperWidth: (input.paperWidth as PrinterPaperWidth | undefined) ?? PrinterPaperWidth.MM80,
          copies: input.copies ?? 1,
        },
      }),
    );
  }

  async issueCredential(input: {
    restaurantId: number | null | undefined;
    devicePublicId?: string;
    name?: string;
  }) {
    const restaurantId = normalizeTenantId(input.restaurantId);
    return prisma.$transaction(async (db) => {
      if (input.devicePublicId) {
        const device = await db.printerAgentDevice.findFirst({
          where: { publicId: input.devicePublicId, restaurantId },
          select: { id: true, publicId: true, name: true },
        });
        if (!device) throw new Error('Agente de impressão não encontrado.');
        const credential = createPrinterAgentCredential(device.publicId);
        await db.printerAgentDevice.updateMany({
          where: { id: device.id, restaurantId },
          data: {
            tokenHash: credential.tokenHash,
            active: true,
            lastSeenAt: null,
            ...(input.name ? { name: input.name } : {}),
          },
        });
        return {
          device: {
            publicId: device.publicId,
            name: input.name || device.name,
          },
          credential: credential.token,
          shownOnce: true,
        };
      }

      const publicId = randomUUID();
      const credential = createPrinterAgentCredential(publicId);
      const device = await db.printerAgentDevice.create({
        data: {
          publicId,
          restaurantId,
          name: input.name || 'Agente principal da cozinha',
          tokenHash: credential.tokenHash,
        },
        select: { publicId: true, name: true },
      });
      return {
        device,
        credential: credential.token,
        shownOnce: true,
      };
    });
  }

  async revokeCredential(restaurantIdInput: number | null | undefined, devicePublicId: string) {
    const restaurantId = normalizeTenantId(restaurantIdInput);
    const result = await prisma.printerAgentDevice.updateMany({
      where: { publicId: devicePublicId, restaurantId, active: true },
      data: { active: false, lastSeenAt: null },
    });
    if (result.count !== 1) throw new Error('Agente de impressão não encontrado.');
    return { revoked: true };
  }

  async printTest(restaurantIdInput: number | null | undefined, requestedByUserId: number) {
    const restaurantId = normalizeTenantId(restaurantIdInput);
    return withTenantDbContext(restaurantId, (db) =>
      kitchenPrintingService.enqueueTestPrint({ restaurantId, requestedByUserId, db }),
    );
  }

  async reprintOrder(input: {
    restaurantId: number | null | undefined;
    orderId: number;
    requestedByUserId: number;
  }) {
    const restaurantId = normalizeTenantId(input.restaurantId);
    return withTenantDbContext(restaurantId, (db) =>
      kitchenPrintingService.enqueueManualReprint({
        restaurantId,
        orderId: input.orderId,
        requestedByUserId: input.requestedByUserId,
        db,
      }),
    );
  }

  async listJobs(restaurantIdInput: number | null | undefined, limit = 20) {
    const restaurantId = normalizeTenantId(restaurantIdInput);
    return withTenantDbContext(restaurantId, (db) =>
      db.kitchenPrintJob.findMany({
        where: { restaurantId },
        orderBy: { createdAt: 'desc' },
        take: Math.max(1, Math.min(50, limit)),
        select: {
          publicId: true,
          orderId: true,
          type: true,
          source: true,
          trigger: true,
          status: true,
          attempts: true,
          availableAt: true,
          printedAt: true,
          lastError: true,
          createdAt: true,
        },
      }),
    );
  }

  async retryJob(restaurantIdInput: number | null | undefined, jobPublicId: string) {
    const restaurantId = normalizeTenantId(restaurantIdInput);
    return withTenantDbContext(restaurantId, async (db) => {
      const updated = await db.kitchenPrintJob.updateMany({
        where: {
          publicId: jobPublicId,
          restaurantId,
          status: KitchenPrintJobStatus.FAILED,
        },
        data: {
          status: KitchenPrintJobStatus.PENDING,
          attempts: 0,
          availableAt: new Date(),
          claimedAt: null,
          leaseExpiresAt: null,
          claimedByDeviceId: null,
          lastError: null,
        },
      });
      if (updated.count !== 1) throw new Error('Job com falha não encontrado para retry.');
      return db.kitchenPrintJob.findFirst({
        where: { publicId: jobPublicId, restaurantId },
        select: { publicId: true, status: true, availableAt: true },
      });
    });
  }
}

export default new KitchenPrintingAdminService();
