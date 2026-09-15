import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';

type Actor = {
  userId: number;
  restaurantId: number;
  userRole?: string | null;
};

type SettingsRow = {
  restaurantId: number;
  autonomyMode: string;
  automationsEnabled: boolean;
  pendingOrderMinutes: number;
  preparingOrderMinutes: number;
  readyOrderMinutes: number;
  deliveryOrderMinutes: number;
  stockAlertThreshold: number;
  minimumForecastOrders: number;
  maxAiRequestsPerHour: number;
  maxConcurrentAiJobs: number;
  version: number;
  updatedAt: Date;
};

const updateSchema = z.object({
  autonomyMode: z.enum(['SUGGEST_ONLY', 'APPROVAL_REQUIRED', 'BOUNDED_AUTOMATION']).optional(),
  automationsEnabled: z.boolean().optional(),
  pendingOrderMinutes: z.number().int().min(1).max(240).optional(),
  preparingOrderMinutes: z.number().int().min(1).max(480).optional(),
  readyOrderMinutes: z.number().int().min(1).max(240).optional(),
  deliveryOrderMinutes: z.number().int().min(1).max(720).optional(),
  stockAlertThreshold: z.number().int().min(0).max(100000).optional(),
  minimumForecastOrders: z.number().int().min(10).max(10000).optional(),
  maxAiRequestsPerHour: z.number().int().min(1).max(200).optional(),
  maxConcurrentAiJobs: z.number().int().min(1).max(10).optional(),
  expectedVersion: z.number().int().positive().optional(),
});

function assertActor(actor: Actor) {
  if (
    String(actor.userRole || '').toUpperCase() !== 'ADMIN' ||
    !Number.isSafeInteger(Number(actor.userId)) ||
    Number(actor.userId) <= 0 ||
    !Number.isSafeInteger(Number(actor.restaurantId)) ||
    Number(actor.restaurantId) <= 0
  ) {
    throw new Error('Conta ADMIN inválida para configurar o assistente.');
  }
}

function serialize(row: SettingsRow) {
  return {
    restaurantId: row.restaurantId,
    autonomyMode: row.autonomyMode,
    automationsEnabled: row.automationsEnabled,
    pendingOrderMinutes: row.pendingOrderMinutes,
    preparingOrderMinutes: row.preparingOrderMinutes,
    readyOrderMinutes: row.readyOrderMinutes,
    deliveryOrderMinutes: row.deliveryOrderMinutes,
    stockAlertThreshold: row.stockAlertThreshold,
    minimumForecastOrders: row.minimumForecastOrders,
    maxAiRequestsPerHour: row.maxAiRequestsPerHour,
    maxConcurrentAiJobs: row.maxConcurrentAiJobs,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensureSettings(db: Prisma.TransactionClient, restaurantId: number, userId: number) {
  await db.$executeRaw(Prisma.sql`
    INSERT INTO "RestaurantAiAssistantSettings" (
      "restaurantId", "updatedByUserId", "createdAt", "updatedAt"
    ) VALUES (${restaurantId}, ${userId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("restaurantId") DO NOTHING
  `);
}

async function read(db: Prisma.TransactionClient, restaurantId: number) {
  const rows = await db.$queryRaw<SettingsRow[]>(Prisma.sql`
    SELECT
      "restaurantId", "autonomyMode", "automationsEnabled", "pendingOrderMinutes",
      "preparingOrderMinutes", "readyOrderMinutes", "deliveryOrderMinutes",
      "stockAlertThreshold", "minimumForecastOrders", "maxAiRequestsPerHour",
      "maxConcurrentAiJobs", "version", "updatedAt"
    FROM "RestaurantAiAssistantSettings"
    WHERE "restaurantId" = ${restaurantId}
    LIMIT 1
  `);
  if (!rows[0]) throw new Error('Configurações do assistente não encontradas.');
  return rows[0];
}

class AdminAiSettingsService {
  async get(actor: Actor) {
    assertActor(actor);
    const restaurantId = Number(actor.restaurantId);
    return withTenantDbContext(restaurantId, async (db) => {
      await ensureSettings(db, restaurantId, Number(actor.userId));
      return serialize(await read(db, restaurantId));
    });
  }

  async update(input: unknown, actor: Actor) {
    assertActor(actor);
    const parsed = updateSchema.parse(input);
    const restaurantId = Number(actor.restaurantId);
    return withTenantDbContext(restaurantId, async (db) => {
      await ensureSettings(db, restaurantId, Number(actor.userId));
      const current = await read(db, restaurantId);
      if (parsed.expectedVersion && parsed.expectedVersion !== current.version) {
        throw new Error('As configurações do assistente foram alteradas por outra sessão. Recarregue antes de salvar.');
      }

      const next = {
        autonomyMode: parsed.autonomyMode ?? current.autonomyMode,
        automationsEnabled: parsed.automationsEnabled ?? current.automationsEnabled,
        pendingOrderMinutes: parsed.pendingOrderMinutes ?? current.pendingOrderMinutes,
        preparingOrderMinutes: parsed.preparingOrderMinutes ?? current.preparingOrderMinutes,
        readyOrderMinutes: parsed.readyOrderMinutes ?? current.readyOrderMinutes,
        deliveryOrderMinutes: parsed.deliveryOrderMinutes ?? current.deliveryOrderMinutes,
        stockAlertThreshold: parsed.stockAlertThreshold ?? current.stockAlertThreshold,
        minimumForecastOrders: parsed.minimumForecastOrders ?? current.minimumForecastOrders,
        maxAiRequestsPerHour: parsed.maxAiRequestsPerHour ?? current.maxAiRequestsPerHour,
        maxConcurrentAiJobs: parsed.maxConcurrentAiJobs ?? current.maxConcurrentAiJobs,
      };

      // Mesmo no modo de automação delimitada, nenhuma ação financeira/credencial é permitida.
      // O flag apenas habilita tarefas explicitamente allowlisted por serviços futuros.
      const rows = await db.$queryRaw<SettingsRow[]>(Prisma.sql`
        UPDATE "RestaurantAiAssistantSettings"
        SET
          "autonomyMode" = ${next.autonomyMode},
          "automationsEnabled" = ${next.automationsEnabled},
          "pendingOrderMinutes" = ${next.pendingOrderMinutes},
          "preparingOrderMinutes" = ${next.preparingOrderMinutes},
          "readyOrderMinutes" = ${next.readyOrderMinutes},
          "deliveryOrderMinutes" = ${next.deliveryOrderMinutes},
          "stockAlertThreshold" = ${next.stockAlertThreshold},
          "minimumForecastOrders" = ${next.minimumForecastOrders},
          "maxAiRequestsPerHour" = ${next.maxAiRequestsPerHour},
          "maxConcurrentAiJobs" = ${next.maxConcurrentAiJobs},
          "updatedByUserId" = ${Number(actor.userId)},
          "version" = "version" + 1,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "restaurantId" = ${restaurantId}
          AND "version" = ${current.version}
        RETURNING
          "restaurantId", "autonomyMode", "automationsEnabled", "pendingOrderMinutes",
          "preparingOrderMinutes", "readyOrderMinutes", "deliveryOrderMinutes",
          "stockAlertThreshold", "minimumForecastOrders", "maxAiRequestsPerHour",
          "maxConcurrentAiJobs", "version", "updatedAt"
      `);
      if (!rows[0]) throw new Error('As configurações foram atualizadas por outra sessão.');

      await db.auditLog.create({
        data: {
          restaurantId,
          userId: Number(actor.userId),
          userRole: actor.userRole || 'ADMIN',
          action: 'AI_ASSISTANT_SETTINGS_UPDATED',
          resource: 'RestaurantAiAssistantSettings',
          metadata: {
            autonomyMode: rows[0].autonomyMode,
            automationsEnabled: rows[0].automationsEnabled,
            version: rows[0].version,
          },
        },
      });
      return serialize(rows[0]);
    });
  }

  async assertRequestBudget(actor: Actor) {
    const settings = await this.get(actor);
    const restaurantId = Number(actor.restaurantId);
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const requests = await withTenantDbContext(restaurantId, (db) =>
      db.auditLog.count({
        where: {
          restaurantId,
          userId: Number(actor.userId),
          action: 'AI_ASSISTANT_REQUESTED',
          createdAt: { gte: since },
        },
      }),
    );
    if (requests >= settings.maxAiRequestsPerHour) {
      throw new Error(`Limite de ${settings.maxAiRequestsPerHour} solicitações de IA por hora atingido para esta conta.`);
    }
    await withTenantDbContext(restaurantId, (db) =>
      db.auditLog.create({
        data: {
          restaurantId,
          userId: Number(actor.userId),
          userRole: actor.userRole || 'ADMIN',
          action: 'AI_ASSISTANT_REQUESTED',
          resource: 'RestaurantAiAssistant',
          metadata: { window: '1h' },
        },
      }),
    );
    return settings;
  }
}

export default new AdminAiSettingsService();
