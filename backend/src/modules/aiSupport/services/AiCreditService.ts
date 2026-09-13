import prisma from '../../../config/prisma.js';

const MONTHLY_LIMIT_MICROS = 5_000_000;
const CREDIT_ACTION = 'OPENAI_CREDIT_USAGE';
const CREDIT_TIME_ZONE = 'America/Sao_Paulo';

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

function dollars(micros: number) {
  return Number((micros / 1_000_000).toFixed(6));
}

class AiCreditService {
  async getBalance(actor: Pick<CreditActor, 'userId' | 'restaurantId'>) {
    const userId = Number(actor.userId);
    const restaurantId = Number(actor.restaurantId);
    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(restaurantId) || restaurantId <= 0) {
      throw new Error('Conta administrativa inválida para consultar créditos de IA.');
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, restaurantId, role: 'ADMIN', active: true },
      select: { id: true },
    });
    if (!user) throw new Error('Conta ADMIN não encontrada para este restaurante.');

    const cycle = currentCycle();
    const entries = await prisma.auditLog.findMany({
      where: {
        userId,
        restaurantId,
        action: CREDIT_ACTION,
        createdAt: { gte: cycle.start, lt: cycle.end },
      },
      select: { metadata: true },
    });
    const usedMicros = entries.reduce((sum, entry) => sum + metadataCostMicros(entry.metadata), 0);
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

  async assertAvailable(actor: Pick<CreditActor, 'userId' | 'restaurantId'>) {
    const balance = await this.getBalance(actor);
    if (balance.exhausted) throw new AiCreditsExhaustedError();
    return balance;
  }

  async recordUsage(input: RecordUsageInput) {
    const costUsd = Number(input.costUsd);
    if (!Number.isFinite(costUsd) || costUsd <= 0) return this.getBalance(input);

    const costMicros = Math.max(1, Math.round(costUsd * 1_000_000));
    const cycle = currentCycle();
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        userName: input.userName || undefined,
        userRole: input.userRole || 'ADMIN',
        restaurantId: input.restaurantId,
        action: CREDIT_ACTION,
        resource: 'OpenAI',
        metadata: {
          provider: 'OPENAI',
          feature: input.feature,
          model: input.model,
          costMicros,
          costUsd: dollars(costMicros),
          usage: input.usage ?? null,
          billingCycle: cycle.key,
        },
      },
    });

    return this.getBalance(input);
  }
}

export const AI_CREDIT_MONTHLY_LIMIT_USD = MONTHLY_LIMIT_MICROS / 1_000_000;
export default new AiCreditService();
