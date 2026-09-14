import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';

const FREE_PREMIUM_GRANT_MICROS = 2_000_000n;

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

type WalletRow = {
  adminUserId: number;
  restaurantId: number;
  balanceMicros: bigint;
  freeGrantClaimedAt: Date | null;
};

export class AiCreditsExhaustedError extends Error {
  code = 'AI_CREDITS_EXHAUSTED' as const;

  constructor() {
    super('Seus créditos de IA acabaram. Faça uma recarga para continuar usando a IA.');
    this.name = 'AiCreditsExhaustedError';
  }
}

function normalizeActor(actor: Pick<CreditActor, 'userId' | 'restaurantId'>) {
  const userId = Number(actor.userId);
  const restaurantId = Number(actor.restaurantId);
  if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new Error('Conta administrativa inválida para consultar créditos de IA.');
  }
  return { userId, restaurantId };
}

function microsFromUsd(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0n;
  return BigInt(Math.max(1, Math.round(value * 1_000_000)));
}

function usdFromMicros(value: bigint) {
  return Number((Number(value) / 1_000_000).toFixed(6));
}

function toJson(value: unknown): Prisma.InputJsonValue {
  if (value === undefined || value === null) return {};
  try {
    const serialized = JSON.stringify(value);
    return serialized ? (JSON.parse(serialized) as Prisma.InputJsonValue) : {};
  } catch {
    return {};
  }
}

async function assertActiveAdmin(
  db: Prisma.TransactionClient | typeof prisma,
  userId: number,
  restaurantId: number,
) {
  const user = await db.user.findFirst({
    where: { id: userId, restaurantId, role: 'ADMIN', active: true },
    select: { id: true },
  });
  if (!user) throw new Error('Conta ADMIN não encontrada para este restaurante.');
}

async function isPremiumRestaurant(
  db: Prisma.TransactionClient | typeof prisma,
  restaurantId: number,
) {
  const subscription = await db.subscription.findUnique({
    where: { restaurantId },
    select: { plan: true, status: true },
  });
  if (!subscription) return false;
  if (subscription.status === 'CANCELADA') return false;
  return subscription.plan === 'PREMIUM';
}

async function readWallet(db: Prisma.TransactionClient, userId: number): Promise<WalletRow | null> {
  const rows = await db.$queryRaw<WalletRow[]>(Prisma.sql`
    SELECT
      "adminUserId",
      "restaurantId",
      "balanceMicros",
      "freeGrantClaimedAt"
    FROM "AiCreditWallet"
    WHERE "adminUserId" = ${userId}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

async function ensureWallet(db: Prisma.TransactionClient, userId: number, restaurantId: number) {
  await db.$executeRaw(Prisma.sql`
    INSERT INTO "AiCreditWallet" (
      "adminUserId", "restaurantId", "balanceMicros", "createdAt", "updatedAt"
    ) VALUES (${userId}, ${restaurantId}, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("adminUserId") DO NOTHING
  `);

  let wallet = await readWallet(db, userId);
  if (!wallet || wallet.restaurantId !== restaurantId) {
    throw new Error('Carteira de créditos de IA inconsistente para esta conta.');
  }

  if (!wallet.freeGrantClaimedAt && (await isPremiumRestaurant(db, restaurantId))) {
    const idempotencyKey = `ai-free-grant:admin:${userId}`;
    const inserted = await db.$executeRaw(Prisma.sql`
      INSERT INTO "AiCreditLedgerEntry" (
        "restaurantId", "adminUserId", "actorUserId", "kind", "amountMicros",
        "balanceAfterMicros", "idempotencyKey", "referenceType", "referenceId", "metadata"
      )
      SELECT
        ${restaurantId}, ${userId}, ${userId}, 'FREE_GRANT', ${FREE_PREMIUM_GRANT_MICROS},
        "balanceMicros" + ${FREE_PREMIUM_GRANT_MICROS}, ${idempotencyKey},
        'PREMIUM_INITIAL_GRANT', ${String(userId)},
        ${JSON.stringify({ amountUsd: 2, oneTime: true })}::jsonb
      FROM "AiCreditWallet"
      WHERE "adminUserId" = ${userId}
        AND "freeGrantClaimedAt" IS NULL
      ON CONFLICT ("idempotencyKey") DO NOTHING
    `);

    if (inserted > 0) {
      await db.$executeRaw(Prisma.sql`
        UPDATE "AiCreditWallet"
        SET
          "balanceMicros" = "balanceMicros" + ${FREE_PREMIUM_GRANT_MICROS},
          "freeGrantClaimedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "adminUserId" = ${userId}
          AND "freeGrantClaimedAt" IS NULL
      `);
    }
    wallet = await readWallet(db, userId);
  }

  if (!wallet) throw new Error('Não foi possível carregar a carteira de créditos de IA.');
  return wallet;
}

function balancePayload(wallet: WalletRow) {
  const balanceUsd = usdFromMicros(wallet.balanceMicros);
  return {
    provider: 'OPENAI' as const,
    currency: 'USD' as const,
    balanceUsd,
    remainingUsd: balanceUsd,
    usedUsd: 0,
    freeGrantUsd: 2,
    freeGrantClaimed: Boolean(wallet.freeGrantClaimedAt),
    exhausted: wallet.balanceMicros <= 0n,
  };
}

export class AiCreditService {
  async getBalance(actor: Pick<CreditActor, 'userId' | 'restaurantId'>) {
    const { userId, restaurantId } = normalizeActor(actor);
    return prisma.$transaction(async (db) => {
      await setTenantDbContext(db, restaurantId);
      await db.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${userId})`);
      await assertActiveAdmin(db, userId, restaurantId);
      const wallet = await ensureWallet(db, userId, restaurantId);
      return balancePayload(wallet);
    });
  }

  async assertAvailable(actor: Pick<CreditActor, 'userId' | 'restaurantId'>) {
    const balance = await this.getBalance(actor);
    if (balance.exhausted) throw new AiCreditsExhaustedError();
    return balance;
  }

  async recordUsage(input: RecordUsageInput) {
    const requestedMicros = microsFromUsd(Number(input.costUsd));
    if (requestedMicros <= 0n) return this.getBalance(input);
    const { userId, restaurantId } = normalizeActor(input);

    return prisma.$transaction(async (db) => {
      await setTenantDbContext(db, restaurantId);
      await db.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${userId})`);
      await assertActiveAdmin(db, userId, restaurantId);
      let wallet = await ensureWallet(db, userId, restaurantId);
      if (wallet.balanceMicros <= 0n) throw new AiCreditsExhaustedError();

      // O custo real só é conhecido após a resposta do provedor. A última operação
      // pode ultrapassar alguns micros do saldo; nesses casos a carteira é zerada
      // e a plataforma absorve apenas esse excedente final, sem saldo negativo.
      const chargedMicros =
        requestedMicros > wallet.balanceMicros ? wallet.balanceMicros : requestedMicros;
      const balanceAfter = wallet.balanceMicros - chargedMicros;
      const idempotencyKey = `ai-usage:${userId}:${crypto.randomUUID()}`;

      await db.$executeRaw(Prisma.sql`
        UPDATE "AiCreditWallet"
        SET "balanceMicros" = ${balanceAfter}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "adminUserId" = ${userId}
      `);
      await db.$executeRaw(Prisma.sql`
        INSERT INTO "AiCreditLedgerEntry" (
          "restaurantId", "adminUserId", "actorUserId", "kind", "amountMicros",
          "balanceAfterMicros", "idempotencyKey", "referenceType", "referenceId", "metadata"
        ) VALUES (
          ${restaurantId}, ${userId}, ${userId}, 'USAGE', ${-chargedMicros},
          ${balanceAfter}, ${idempotencyKey}, 'OPENAI_USAGE', ${input.feature},
          ${JSON.stringify({
            provider: 'OPENAI',
            feature: input.feature,
            model: input.model,
            providerCostUsd: Number(input.costUsd),
            chargedUsd: usdFromMicros(chargedMicros),
            usage: toJson(input.usage),
          })}::jsonb
        )
      `);

      wallet = { ...wallet, balanceMicros: balanceAfter };
      return balancePayload(wallet);
    });
  }

  async creditPurchase(
    actor: Pick<CreditActor, 'userId' | 'restaurantId'>,
    input: { topUpPublicId: string; amountUsdMicros: bigint },
  ) {
    const { userId, restaurantId } = normalizeActor(actor);
    if (input.amountUsdMicros <= 0n) throw new Error('Valor de crédito inválido.');

    return prisma.$transaction(async (db) => {
      await setTenantDbContext(db, restaurantId);
      await db.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${userId})`);
      await assertActiveAdmin(db, userId, restaurantId);
      const wallet = await ensureWallet(db, userId, restaurantId);
      const balanceAfter = wallet.balanceMicros + input.amountUsdMicros;
      const idempotencyKey = `ai-topup-paid:${input.topUpPublicId}`;

      const inserted = await db.$executeRaw(Prisma.sql`
        INSERT INTO "AiCreditLedgerEntry" (
          "restaurantId", "adminUserId", "actorUserId", "kind", "amountMicros",
          "balanceAfterMicros", "idempotencyKey", "referenceType", "referenceId", "metadata"
        ) VALUES (
          ${restaurantId}, ${userId}, ${userId}, 'PURCHASE', ${input.amountUsdMicros},
          ${balanceAfter}, ${idempotencyKey}, 'AI_CREDIT_TOPUP', ${input.topUpPublicId},
          ${JSON.stringify({ source: 'MERCADO_PAGO' })}::jsonb
        )
        ON CONFLICT ("idempotencyKey") DO NOTHING
      `);
      if (inserted > 0) {
        await db.$executeRaw(Prisma.sql`
          UPDATE "AiCreditWallet"
          SET "balanceMicros" = ${balanceAfter}, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "adminUserId" = ${userId}
        `);
      }

      const current = await readWallet(db, userId);
      if (!current) throw new Error('Carteira de créditos de IA não encontrada.');
      return balancePayload(current);
    });
  }
}

export const AI_CREDIT_INITIAL_PREMIUM_GRANT_USD = 2;
export default new AiCreditService();
