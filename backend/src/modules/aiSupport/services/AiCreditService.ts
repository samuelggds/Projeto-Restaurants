import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';

const FREE_RESTAURANT_GRANT_MICROS = 2_000_000n;

type ProviderIdentity = { providerPaymentId: string; providerOrderId?: string | null };
type TopUpReversalRow = {
  status: string;
  creditUsdMicros: bigint;
  reversedUsdMicros: bigint;
  reversalPending: boolean;
  reversalSnapshotAt: Date | null;
  providerPaymentId: string | null;
  providerOrderId: string | null;
};

function assertProviderIdentity(
  row: Pick<TopUpReversalRow, 'providerPaymentId' | 'providerOrderId'>,
  input: ProviderIdentity,
) {
  if (
    !input.providerPaymentId ||
    (row.providerPaymentId && row.providerPaymentId !== input.providerPaymentId) ||
    (row.providerOrderId && row.providerOrderId !== input.providerOrderId)
  ) {
    throw new Error('Identificação do pagamento da recarga divergente.');
  }
}

export type CreditActor = {
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
  debtMicros: bigint;
  freeGrantClaimedAt: Date | null;
  reservedMicros: bigint;
  pendingRequest: boolean;
  pendingReversal: boolean;
};

export class AiCreditsExhaustedError extends Error {
  code: string;

  constructor(
    message = 'Saldo de IA insuficiente para esta operação. Faça uma recarga para continuar.',
    code = 'AI_CREDITS_EXHAUSTED',
  ) {
    super(message);
    this.code = code;
    this.name = 'AiCreditsExhaustedError';
  }
}

function normalizeActor(actor: Pick<CreditActor, 'userId' | 'restaurantId'>) {
  const userId = Number(actor.userId);
  const restaurantId = Number(actor.restaurantId);
  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    !Number.isInteger(restaurantId) ||
    restaurantId <= 0
  ) {
    throw new Error('Conta administrativa inválida para consultar créditos de IA.');
  }
  return { userId, restaurantId };
}

function microsFromUsd(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0n;
  return BigInt(Math.max(1, Math.ceil(value * 1_000_000)));
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

async function readWallet(db: Prisma.TransactionClient, userId: number): Promise<WalletRow | null> {
  const rows = await db.$queryRaw<WalletRow[]>(Prisma.sql`
    SELECT
      "adminUserId",
      "restaurantId",
      "balanceMicros",
      "debtMicros",
      "freeGrantClaimedAt",
      EXISTS(SELECT 1 FROM "AiCreditTopUp" t WHERE t."adminUserId" = ${userId}
        AND t."restaurantId" = "AiCreditWallet"."restaurantId" AND t."reversalPending") AS "pendingReversal",
      COALESCE((SELECT SUM(r."reservedMicros") FROM "AiCreditReservation" r
        WHERE r."adminUserId" = ${userId} AND r."restaurantId" = "AiCreditWallet"."restaurantId"
        AND r."status" IN ('HELD', 'UNCERTAIN')), 0)::bigint AS "reservedMicros",
      EXISTS(SELECT 1 FROM "AiCreditReservation" r WHERE r."adminUserId" = ${userId}
        AND r."restaurantId" = "AiCreditWallet"."restaurantId" AND r."status" IN ('HELD', 'UNCERTAIN')) AS "pendingRequest"
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

  if (!wallet.freeGrantClaimedAt) {
    const idempotencyKey = `ai-free-grant:restaurant:${restaurantId}`;
    const inserted = await db.$executeRaw(Prisma.sql`
      INSERT INTO "AiCreditLedgerEntry" (
        "restaurantId", "adminUserId", "actorUserId", "kind", "amountMicros",
        "balanceAfterMicros", "idempotencyKey", "referenceType", "referenceId", "metadata"
      )
      SELECT
        ${restaurantId}, ${userId}, ${userId}, 'FREE_GRANT', ${FREE_RESTAURANT_GRANT_MICROS},
        "balanceMicros" + ${FREE_RESTAURANT_GRANT_MICROS}, ${idempotencyKey},
        'RESTAURANT_INITIAL_GRANT', ${String(restaurantId)},
        ${JSON.stringify({ amountUsd: 2, oneTime: true, scope: 'RESTAURANT' })}::jsonb
      FROM "AiCreditWallet"
      WHERE "adminUserId" = ${userId}
        AND "freeGrantClaimedAt" IS NULL
      ON CONFLICT ("idempotencyKey") DO NOTHING
    `);

    if (inserted > 0) {
      await db.$executeRaw(Prisma.sql`
        UPDATE "AiCreditWallet"
        SET
          "balanceMicros" = "balanceMicros" + ${FREE_RESTAURANT_GRANT_MICROS},
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
  const available = wallet.balanceMicros - wallet.reservedMicros - wallet.debtMicros;
  const balanceUsd = usdFromMicros(!wallet.pendingReversal && available > 0n ? available : 0n);
  return {
    provider: 'OPENAI' as const,
    currency: 'USD' as const,
    balanceUsd,
    debtUsd: usdFromMicros(wallet.debtMicros),
    reservedUsd: usdFromMicros(wallet.reservedMicros),
    pendingRequest: wallet.pendingRequest,
    pendingReversal: wallet.pendingReversal,
    remainingUsd: balanceUsd,
    usedUsd: 0,
    freeGrantUsd: 2,
    freeGrantClaimed: Boolean(wallet.freeGrantClaimedAt),
    exhausted: wallet.pendingReversal || available <= 0n,
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
    if (balance.pendingReversal)
      throw new AiCreditsExhaustedError(
        'Recarga em conciliação com o provedor. Aguarde a confirmação ou contate o suporte.',
        'AI_CREDIT_PENDING',
      );
    if (balance.pendingRequest)
      throw new AiCreditsExhaustedError(
        'Existe uma solicitação de IA em andamento ou aguardando confirmação. Aguarde; se persistir, contate o suporte.',
        'AI_CREDIT_PENDING',
      );
    if (balance.exhausted) throw new AiCreditsExhaustedError();
    return balance;
  }

  async reserve(input: CreditActor & { feature: string; model: string; budgetUsd: number }) {
    const { userId, restaurantId } = normalizeActor(input);
    const reservedMicros = microsFromUsd(input.budgetUsd);
    if (reservedMicros <= 0n) throw new Error('Orçamento de IA inválido.');
    return prisma.$transaction(async (db) => {
      await setTenantDbContext(db, restaurantId);
      await db.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${userId})`);
      await assertActiveAdmin(db, userId, restaurantId);
      const wallet = await ensureWallet(db, userId, restaurantId);
      if (wallet.pendingReversal)
        throw new AiCreditsExhaustedError(
          'Recarga em conciliação com o provedor. Aguarde a confirmação ou contate o suporte.',
          'AI_CREDIT_PENDING',
        );
      if (wallet.pendingRequest)
        throw new AiCreditsExhaustedError(
          'Existe uma solicitação de IA em andamento ou aguardando confirmação. Aguarde; se persistir, contate o suporte.',
          'AI_CREDIT_PENDING',
        );
      if (wallet.balanceMicros - wallet.debtMicros < reservedMicros)
        throw new AiCreditsExhaustedError();
      const id = crypto.randomUUID();
      await db.$executeRaw(Prisma.sql`
        INSERT INTO "AiCreditReservation" ("id", "adminUserId", "restaurantId", "feature", "model", "reservedMicros")
        VALUES (${id}::uuid, ${userId}, ${restaurantId}, ${input.feature}, ${input.model}, ${reservedMicros})
      `);
      return id;
    });
  }

  async markReservation(
    input: CreditActor,
    id: string,
    status: 'RELEASED' | 'UNCERTAIN',
    providerRequestId?: string,
  ) {
    const { userId, restaurantId } = normalizeActor(input);
    await prisma.$transaction(async (db) => {
      await setTenantDbContext(db, restaurantId);
      await db.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${userId})`);
      await db.$executeRaw(Prisma.sql`
        UPDATE "AiCreditReservation" SET "status" = ${status}, "updatedAt" = CURRENT_TIMESTAMP,
          "providerRequestId" = COALESCE(${providerRequestId?.slice(0, 191) ?? null}, "providerRequestId")
        WHERE "id" = ${id}::uuid AND "adminUserId" = ${userId} AND "restaurantId" = ${restaurantId} AND "status" = 'HELD'
      `);
    });
  }

  async settleReservation(
    input: RecordUsageInput & { reservationId: string; providerRequestId?: string },
  ) {
    const requestedMicros = microsFromUsd(Number(input.costUsd));
    if (requestedMicros <= 0n)
      throw new Error('Uso do provedor ausente ou inválido; conciliação necessária.');
    const { userId, restaurantId } = normalizeActor(input);

    return prisma.$transaction(async (db) => {
      await setTenantDbContext(db, restaurantId);
      await db.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${userId})`);
      const wallet = await readWallet(db, userId);
      if (!wallet || wallet.restaurantId !== restaurantId) throw new Error('Carteira inválida.');
      const rows = await db.$queryRaw<Array<{ status: string; reservedMicros: bigint }>>(Prisma.sql`
        SELECT "status", "reservedMicros" FROM "AiCreditReservation"
        WHERE "id" = ${input.reservationId}::uuid AND "adminUserId" = ${userId} AND "restaurantId" = ${restaurantId}
      `);
      const reservation = rows[0];
      if (reservation?.status === 'SETTLED') return balancePayload(wallet);
      if (!reservation || !['HELD', 'UNCERTAIN'].includes(reservation.status))
        throw new Error('Reserva de IA inválida.');
      if (requestedMicros > reservation.reservedMicros || requestedMicros > wallet.balanceMicros)
        throw new Error('Custo de IA excedeu a reserva; conciliação necessária.');
      const chargedMicros = requestedMicros;
      const balanceAfter = wallet.balanceMicros - chargedMicros;
      const idempotencyKey = `ai-usage:${input.reservationId}`;

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

      await db.$executeRaw(Prisma.sql`
        UPDATE "AiCreditReservation" SET "status" = 'SETTLED', "chargedMicros" = ${chargedMicros},
          "providerRequestId" = ${input.providerRequestId?.slice(0, 191) ?? null}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${input.reservationId}::uuid AND "adminUserId" = ${userId} AND "restaurantId" = ${restaurantId}
      `);
      return balancePayload({
        ...wallet,
        balanceMicros: balanceAfter,
        reservedMicros: 0n,
        pendingRequest: false,
      });
    });
  }

  async creditPurchase(
    actor: Pick<CreditActor, 'userId' | 'restaurantId'>,
    input: {
      topUpPublicId: string;
      amountUsdMicros: bigint;
      providerPaymentId: string;
      providerOrderId?: string | null;
      transactionReference?: string | null;
      snapshotAt?: Date | null;
    },
  ) {
    const { userId, restaurantId } = normalizeActor(actor);
    if (input.amountUsdMicros <= 0n) throw new Error('Valor de crédito inválido.');

    return prisma.$transaction(async (db) => {
      await setTenantDbContext(db, restaurantId);
      await db.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${userId})`);
      await assertActiveAdmin(db, userId, restaurantId);
      const wallet = await ensureWallet(db, userId, restaurantId);
      const topUps = await db.$queryRaw<TopUpReversalRow[]>(Prisma.sql`
        SELECT "status", "reversedUsdMicros", "creditUsdMicros", "reversalPending", "reversalSnapshotAt", "providerPaymentId", "providerOrderId" FROM "AiCreditTopUp"
        WHERE "publicId" = ${input.topUpPublicId} AND "adminUserId" = ${userId} AND "restaurantId" = ${restaurantId}
        FOR UPDATE
      `);
      const topUp = topUps[0];
      if (!topUp || topUp.creditUsdMicros !== input.amountUsdMicros)
        throw new Error('Recarga inválida.');
      assertProviderIdentity(topUp, input);
      // Only a strictly newer canonical approval can resolve a pending dispute/refund.
      // It never restores credits already reversed; those require separate evidence.
      if (
        topUp.reversalPending &&
        topUp.reversalSnapshotAt &&
        input.snapshotAt &&
        input.snapshotAt > topUp.reversalSnapshotAt
      ) {
        await db.$executeRaw(Prisma.sql`
          UPDATE "AiCreditTopUp" SET "reversalPending" = false, "reversalSnapshotAt" = ${input.snapshotAt},
            "updatedAt" = CURRENT_TIMESTAMP WHERE "publicId" = ${input.topUpPublicId} AND "restaurantId" = ${restaurantId} AND "adminUserId" = ${userId}
        `);
        topUp.reversalPending = false;
      }
      if (topUp.reversedUsdMicros > 0n || topUp.reversalPending) {
        return { ...balancePayload((await readWallet(db, userId))!), topUpStatus: topUp.status };
      }
      const debtRepaid =
        wallet.debtMicros < input.amountUsdMicros ? wallet.debtMicros : input.amountUsdMicros;
      const balanceAfter = wallet.balanceMicros + input.amountUsdMicros - debtRepaid;
      const idempotencyKey = `ai-topup-paid:${input.topUpPublicId}`;

      const inserted = await db.$executeRaw(Prisma.sql`
        INSERT INTO "AiCreditLedgerEntry" (
          "restaurantId", "adminUserId", "actorUserId", "kind", "amountMicros",
          "balanceAfterMicros", "idempotencyKey", "referenceType", "referenceId", "metadata"
        ) VALUES (
          ${restaurantId}, ${userId}, ${userId}, 'PURCHASE', ${input.amountUsdMicros},
          ${balanceAfter}, ${idempotencyKey}, 'AI_CREDIT_TOPUP', ${input.topUpPublicId},
          ${JSON.stringify({ source: 'MERCADO_PAGO', debtRepaidMicros: String(debtRepaid) })}::jsonb
        )
        ON CONFLICT ("idempotencyKey") DO NOTHING
      `);
      if (inserted > 0) {
        await db.$executeRaw(Prisma.sql`
          UPDATE "AiCreditWallet"
          SET "balanceMicros" = ${balanceAfter}, "debtMicros" = "debtMicros" - ${debtRepaid}, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "adminUserId" = ${userId}
        `);
      }

      await db.$executeRaw(Prisma.sql`
        UPDATE "AiCreditTopUp" SET "status" = 'PAID', "paidAt" = COALESCE("paidAt", CURRENT_TIMESTAMP),
          "providerPaymentId" = ${input.providerPaymentId}, "providerOrderId" = COALESCE(${input.providerOrderId ?? null}, "providerOrderId"),
          "providerTransactionReference" = COALESCE(${input.transactionReference ?? null}, "providerTransactionReference"),
          "failureReason" = NULL, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "publicId" = ${input.topUpPublicId} AND "restaurantId" = ${restaurantId} AND "adminUserId" = ${userId}
      `);
      if (input.transactionReference && input.providerOrderId && inserted > 0) {
        await db.$executeRaw(Prisma.sql`
          UPDATE "PlatformBillingProfile" SET "providerPreviousTransactionReference" = ${input.transactionReference},
            "updatedAt" = CURRENT_TIMESTAMP WHERE "restaurantId" = ${restaurantId} AND "provider" = 'MERCADO_PAGO'
        `);
      }
      const current = await readWallet(db, userId);
      if (!current) throw new Error('Carteira de créditos de IA não encontrada.');
      return { ...balancePayload(current), topUpStatus: 'PAID' };
    });
  }
  async reversePurchase(
    actor: Pick<CreditActor, 'userId' | 'restaurantId'>,
    input: ProviderIdentity & {
      topUpPublicId: string;
      cumulativeUsdMicros: bigint;
      reason: 'REFUNDED' | 'CHARGED_BACK';
      snapshotAt?: Date | null;
    },
  ) {
    const { userId, restaurantId } = normalizeActor(actor);
    return prisma.$transaction(async (db) => {
      await setTenantDbContext(db, restaurantId);
      await db.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${userId})`);
      const [topUp] = await db.$queryRaw<TopUpReversalRow[]>(Prisma.sql`
        SELECT "status", "creditUsdMicros", "reversedUsdMicros", "reversalPending", "reversalSnapshotAt", "providerPaymentId", "providerOrderId" FROM "AiCreditTopUp"
        WHERE "publicId" = ${input.topUpPublicId} AND "adminUserId" = ${userId} AND "restaurantId" = ${restaurantId} FOR UPDATE
      `);
      if (
        !topUp ||
        input.cumulativeUsdMicros <= 0n ||
        input.cumulativeUsdMicros > topUp.creditUsdMicros
      )
        throw new Error('Estorno de recarga inválido.');
      assertProviderIdentity(topUp, input);
      if (
        topUp.reversalSnapshotAt &&
        input.snapshotAt &&
        input.snapshotAt < topUp.reversalSnapshotAt
      )
        return;
      const delta = input.cumulativeUsdMicros - topUp.reversedUsdMicros;
      if (delta < 0n) return;
      const [purchase] = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        SELECT "id" FROM "AiCreditLedgerEntry" WHERE "idempotencyKey" = ${'ai-topup-paid:' + input.topUpPublicId}
          AND "restaurantId" = ${restaurantId} AND "adminUserId" = ${userId}
      `);
      // A confirmed partial refund proves the original charge settled. A webhook may
      // arrive before approval: credit and reverse within this transaction, never
      // exposing the gross purchase between the two entries.
      const establishPurchase =
        !purchase &&
        topUp.reversedUsdMicros === 0n &&
        input.cumulativeUsdMicros < topUp.creditUsdMicros;
      if ((purchase && delta > 0n) || establishPurchase) {
        const wallet = establishPurchase
          ? await ensureWallet(db, userId, restaurantId)
          : await readWallet(db, userId);
        if (!wallet || wallet.restaurantId !== restaurantId)
          throw new Error('Carteira de estorno inválida.');
        if (establishPurchase) {
          const debtRepaid =
            wallet.debtMicros < topUp.creditUsdMicros ? wallet.debtMicros : topUp.creditUsdMicros;
          wallet.balanceMicros += topUp.creditUsdMicros - debtRepaid;
          wallet.debtMicros -= debtRepaid;
          await db.$executeRaw(Prisma.sql`
            INSERT INTO "AiCreditLedgerEntry" ("restaurantId", "adminUserId", "actorUserId", "kind", "amountMicros",
              "balanceAfterMicros", "idempotencyKey", "referenceType", "referenceId", "metadata")
            VALUES (${restaurantId}, ${userId}, ${userId}, 'PURCHASE', ${topUp.creditUsdMicros}, ${wallet.balanceMicros},
              ${'ai-topup-paid:' + input.topUpPublicId}, 'AI_CREDIT_TOPUP', ${input.topUpPublicId},
              ${JSON.stringify({ source: 'MERCADO_PAGO', evidence: 'CONFIRMED_PARTIAL_REFUND', debtRepaidMicros: String(debtRepaid) })}::jsonb)
          `);
        }
        // Protect held provider usage; debt prevents spending reversed funds after release or settlement.
        const available =
          wallet.balanceMicros > wallet.reservedMicros
            ? wallet.balanceMicros - wallet.reservedMicros
            : 0n;
        const debit = available < delta ? available : delta;
        const debt = wallet.debtMicros + delta - debit;
        const balance = wallet.balanceMicros - debit;
        await db.$executeRaw(Prisma.sql`
          UPDATE "AiCreditWallet" SET "balanceMicros" = ${balance}, "debtMicros" = ${debt}, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "adminUserId" = ${userId} AND "restaurantId" = ${restaurantId}
        `);
        await db.$executeRaw(Prisma.sql`
          INSERT INTO "AiCreditLedgerEntry" ("restaurantId", "adminUserId", "actorUserId", "kind", "amountMicros",
            "balanceAfterMicros", "idempotencyKey", "referenceType", "referenceId", "metadata")
          VALUES (${restaurantId}, ${userId}, ${userId}, 'ADJUSTMENT', ${-delta}, ${balance},
            ${'ai-topup-reversal:' + input.topUpPublicId + ':' + input.cumulativeUsdMicros}, 'AI_CREDIT_TOPUP', ${input.topUpPublicId},
            ${JSON.stringify({ reason: input.reason, debtAfterMicros: String(debt), cumulativeUsdMicros: String(input.cumulativeUsdMicros) })}::jsonb)
        `);
      }
      await db.$executeRaw(Prisma.sql`
        UPDATE "AiCreditTopUp" SET "reversedUsdMicros" = ${input.cumulativeUsdMicros},
          "providerPaymentId" = ${input.providerPaymentId}, "providerOrderId" = COALESCE(${input.providerOrderId ?? null}, "providerOrderId"),
          "status" = CASE WHEN ${input.cumulativeUsdMicros} = "creditUsdMicros" THEN 'CANCELED' ELSE 'PAID' END,
          "paidAt" = CASE WHEN ${Boolean(purchase || establishPurchase)} THEN COALESCE("paidAt", CURRENT_TIMESTAMP) ELSE "paidAt" END,
          "reversalPending" = CASE WHEN "reversalSnapshotAt" IS NULL OR ${input.snapshotAt ?? null}::timestamp >= "reversalSnapshotAt" THEN false ELSE "reversalPending" END,
          "reversalSnapshotAt" = COALESCE(${input.snapshotAt ?? null}, "reversalSnapshotAt"),
          "failureReason" = ${input.reason}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "publicId" = ${input.topUpPublicId} AND "adminUserId" = ${userId} AND "restaurantId" = ${restaurantId}
      `);
    });
  }

  async holdPurchaseForReconciliation(
    actor: Pick<CreditActor, 'userId' | 'restaurantId'>,
    input: ProviderIdentity & { topUpPublicId: string; snapshotAt?: Date | null },
  ) {
    const { userId, restaurantId } = normalizeActor(actor);
    await prisma.$transaction(async (db) => {
      await setTenantDbContext(db, restaurantId);
      await db.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${userId})`);
      const [topUp] = await db.$queryRaw<TopUpReversalRow[]>(Prisma.sql`
        SELECT "status", "creditUsdMicros", "reversedUsdMicros", "reversalPending", "reversalSnapshotAt", "providerPaymentId", "providerOrderId" FROM "AiCreditTopUp"
        WHERE "publicId" = ${input.topUpPublicId} AND "adminUserId" = ${userId} AND "restaurantId" = ${restaurantId} FOR UPDATE
      `);
      if (!topUp) throw new Error('Recarga para conciliação não encontrada.');
      assertProviderIdentity(topUp, input);
      if (
        topUp.reversedUsdMicros === topUp.creditUsdMicros ||
        (topUp.reversalSnapshotAt &&
          input.snapshotAt &&
          input.snapshotAt < topUp.reversalSnapshotAt)
      )
        return;
      await db.$executeRaw(Prisma.sql`
        UPDATE "AiCreditTopUp" SET "reversalPending" = true,
          "providerPaymentId" = ${input.providerPaymentId}, "providerOrderId" = COALESCE(${input.providerOrderId ?? null}, "providerOrderId"),
          "reversalSnapshotAt" = COALESCE(${input.snapshotAt ?? null}, "reversalSnapshotAt"),
          "failureReason" = 'Reversão aguardando confirmação do valor pelo provedor.', "updatedAt" = CURRENT_TIMESTAMP
        WHERE "publicId" = ${input.topUpPublicId} AND "adminUserId" = ${userId} AND "restaurantId" = ${restaurantId}
      `);
    });
  }
}

export const AI_CREDIT_INITIAL_PREMIUM_GRANT_USD = 2;
export default new AiCreditService();
