import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';

const MONTHLY_LIMIT_MICROS = 5_000_000;
const CREDIT_ACTION = 'OPENAI_CREDIT_USAGE';
const CREDIT_TIME_ZONE = 'America/Sao_Paulo';

type CreditDb = Prisma.TransactionClient;

export class AiCreditsExhaustedError extends Error {
  code = 'AI_CREDITS_EXHAUSTED' as const;

  constructor() {
    super('Seus créditos mensais de OpenAI acabaram. O saldo será renovado no próximo mês.');
    this.name = 'AiCreditsExhaustedError';
  }
}

type CreditActor = {
  userId: number;
  restaurantId: number;
  userName?: string | null;
  userRole?: string | null;
};

type RecordUsageInput = CreditActor & {
  feature: string;
  model: string;
  costUsd: number;
  usage?: unknown;
};

function currentCycle(reference = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CREDIT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(reference);
  const year = Number(parts.find((part) => part.type === 'year')?.value || reference.getUTCFullYear());
  const month = Number(parts.find((part) => part.type === 'month')?.value || reference.getUTCMonth() + 1);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const monthText = String(month).padStart(2, '0');
  const nextMonthText = String(nextMonth).padStart(2, '0');

  return {
    key: `${year}-${monthText}`,
    start: new Date(`${year}-${monthText}-01T00:00:00-03:00`),
    end: new Date(`${nextYear}-${nextMonthText}-01T00:00:00-03:00`),
  };
}

function metadataCostMicros(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return 0;
  const value = Number((metadata as Record<string, unknown>).costMicros || 0);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  if (value === undefined || value === null) return {};
  try {
    const serialized = JSON.stringify(value);
    if (!serialized) return {};
    return JSON.parse(serialized) as Prisma.InputJsonValue;
  } catch {
    return {};
  }
}

function dollars(micros: number) {
  return Number((micros / 1_000_000).toFixed(6));
}

function normalizeActor(actor: Pick<CreditActor, 'userId' | 'restaurantId'>) {
  const userId = Number(actor.userId);
  const restaurantId = Number(actor.restaurantId);
  if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new Error('Conta administrativa inválida para consultar créditos de IA.');
  }
  return { userId, restaurantId };
}

async function assertAdmin(db: CreditDb | typeof prisma, userId: number, restaurantId: number) {
  const user = await db.user.findFirst({
    where: { id: userId, restaurantId, role: 'ADMIN', active: true },
    select: { id: true },
  });
  if (!user) throw new Error('Conta ADMIN não encontrada para este restaurante.');
}

async function readUsedMicros(
  db: CreditDb | typeof prisma,
  userId: number,
  restaurantId: number,
  cycle: ReturnType<typeof currentCycle>,
) {
  const entries = await db.auditLog.findMany({
    where: {
      userId,
      restaurantId,
      action: CREDIT_ACTION,
      createdAt: { gte: cycle.start, lt: cycle.end },
    },
    select: { metadata: true },
  });
  return entries.reduce((sum, entry) => sum + metadataCostMicros(entry.metadata), 0);
}

function balancePayload(usedMicrosInput: number, cycle: ReturnType<typeof currentCycle>) {
  const usedMicros = Math.min(MONTHLY_LIMIT_MICROS, Math.max(0, usedMicrosInput));
  const remainingMicros = Math.max(0, MONTHLY_LIMIT_MICROS - usedMicros);
  return {
    provider: 'OPENAI' as const,
    currency: 'USD' as const,
    monthlyLimitUsd: dollars(MONTHLY_LIMIT_MICROS),
    usedUsd: dollars(usedMicros),
    remainingUsd: dollars(remainingMicros),
    usedPercent: Math.min(100, Number(((usedMicros / MONTHLY_LIMIT_MICROS) * 100).toFixed(2))),
    exhausted: remainingMicros <= 0,
    cycle: cycle.key,
    renewsAt: cycle.end.toISOString(),
  };
}

class AiCreditService {
  async getBalance(actor: Pick<CreditActor, 'userId' | 'restaurantId'>) {
    const { userId, restaurantId } = normalizeActor(actor);
    await assertAdmin(prisma, userId, restaurantId);
    const cycle = currentCycle();
    const usedMicros = await readUsedMicros(prisma, userId, restaurantId, cycle);
    return balancePayload(usedMicros, cycle);
  }

  async assertAvailable(actor: Pick<CreditActor, 'userId' | 'restaurantId'>) {
    const balance = await this.getBalance(actor);
    if (balance.exhausted) throw new AiCreditsExhaustedError();
    return balance;
  }

  async recordUsage(input: RecordUsageInput) {
    const costUsd = Number(input.costUsd);
    if (!Number.isFinite(costUsd) || costUsd <= 0) return this.getBalance(input);

    const requestedCostMicros = Math.max(1, Math.round(costUsd * 1_000_000));
    const { userId, restaurantId } = normalizeActor(input);

    return prisma.$transaction(async (db) => {
      // Serialize every balance mutation for the same ADMIN account. This prevents
      // two concurrent OpenAI responses from recording more than the monthly cap.
      await db.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
      await assertAdmin(db, userId, restaurantId);

      const cycle = currentCycle();
      const usedMicros = await readUsedMicros(db, userId, restaurantId, cycle);
      const remainingMicros = Math.max(0, MONTHLY_LIMIT_MICROS - usedMicros);
      if (remainingMicros <= 0) throw new AiCreditsExhaustedError();

      const costMicros = Math.min(requestedCostMicros, remainingMicros);
      await db.auditLog.create({
        data: {
          userId,
          userName: input.userName || undefined,
          userRole: input.userRole || 'ADMIN',
          restaurantId,
          action: CREDIT_ACTION,
          resource: 'OpenAI',
          metadata: {
            provider: 'OPENAI',
            feature: input.feature,
            model: input.model,
            costMicros,
            providerCostMicros: requestedCostMicros,
            costUsd: dollars(costMicros),
            providerCostUsd: dollars(requestedCostMicros),
            cappedAtMonthlyLimit: requestedCostMicros > remainingMicros,
            usage: toPrismaJson(input.usage),
            billingCycle: cycle.key,
          },
        },
      });

      return balancePayload(usedMicros + costMicros, cycle);
    });
  }
}

export const AI_CREDIT_MONTHLY_LIMIT_USD = MONTHLY_LIMIT_MICROS / 1_000_000;
export default new AiCreditService();
