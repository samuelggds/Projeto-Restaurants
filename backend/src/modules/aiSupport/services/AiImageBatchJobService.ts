import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import generateImportedProductImageService from '../../menuImport/services/GenerateImportedProductImageService.js';
import aiCreditService from './AiCreditService.js';
import { publicAiFailure } from './publicAiFailure.js';

const ESTIMATED_IMAGE_COST_USD = 0.009;
const LOCK_MS = 4 * 60 * 1000;

type Actor = {
  userId: number;
  restaurantId: number;
  userName?: string | null;
  userRole?: string | null;
};

type JobRow = {
  id: bigint;
  publicId: string;
  restaurantId: number;
  actorUserId: number;
  kind: string;
  status: string;
  estimatedCreditUsd: Prisma.Decimal | number | string;
  actualCreditUsd: Prisma.Decimal | number | string;
  attempts: number;
  cancelRequested: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

type JobItemRow = {
  id: bigint;
  publicId: string;
  entityId: string;
  status: string;
  result: unknown;
  error: string | null;
  attempts: number;
  startedAt: Date | null;
  completedAt: Date | null;
};

type ClaimedItem = {
  jobId: bigint;
  jobPublicId: string;
  itemId: bigint;
  itemPublicId: string;
  restaurantId: number;
  actorUserId: number;
  entityId: string;
  lockToken: string;
};

const enqueueSchema = z.object({
  productIds: z.array(z.number().int().positive()).min(1).max(100),
});

function assertActor(actor: Actor) {
  if (
    String(actor.userRole || '').toUpperCase() !== 'ADMIN' ||
    !Number.isSafeInteger(Number(actor.userId)) ||
    Number(actor.userId) <= 0 ||
    !Number.isSafeInteger(Number(actor.restaurantId)) ||
    Number(actor.restaurantId) <= 0
  ) {
    throw new Error('Conta ADMIN inválida para criar jobs de IA.');
  }
}

function stableBatchKey(actor: Actor, productIds: number[]) {
  const normalized = [...new Set(productIds)].sort((a, b) => a - b).join(',');
  const digest = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
  return `product-images:${actor.userId}:${digest}`;
}

function serializeJob(job: JobRow, items: JobItemRow[]) {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  return {
    publicId: job.publicId,
    kind: job.kind,
    status: job.status,
    estimatedCreditUsd: Number(job.estimatedCreditUsd || 0),
    actualCreditUsd: Number(job.actualCreditUsd || 0),
    attempts: job.attempts,
    cancelRequested: job.cancelRequested,
    counts,
    progress: {
      total: items.length,
      completed: items.filter((item) =>
        ['COMPLETED', 'MANUAL_REQUIRED', 'SKIPPED', 'CANCELED'].includes(item.status),
      ).length,
      failed: items.filter((item) => item.status === 'FAILED').length,
      pending: items.filter((item) => item.status === 'PENDING').length,
      running: items.filter((item) => item.status === 'RUNNING').length,
    },
    items: items.map((item) => ({
      publicId: item.publicId,
      productId: Number(item.entityId),
      status: item.status,
      result: item.result,
      error: item.error,
      attempts: item.attempts,
      startedAt: item.startedAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
    })),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

async function readJob(db: Prisma.TransactionClient, restaurantId: number, publicId: string) {
  const jobs = await db.$queryRaw<JobRow[]>(Prisma.sql`
    SELECT
      "id", "publicId", "restaurantId", "actorUserId", "kind", "status",
      "estimatedCreditUsd", "actualCreditUsd", "attempts", "cancelRequested",
      "createdAt", "updatedAt", "completedAt"
    FROM "RestaurantAiJob"
    WHERE "restaurantId" = ${restaurantId} AND "publicId" = ${publicId}
    LIMIT 1
  `);
  const job = jobs[0];
  if (!job) return null;
  const items = await db.$queryRaw<JobItemRow[]>(Prisma.sql`
    SELECT "id", "publicId", "entityId", "status", "result", "error", "attempts", "startedAt", "completedAt"
    FROM "RestaurantAiJobItem"
    WHERE "restaurantId" = ${restaurantId} AND "jobId" = ${job.id}
    ORDER BY "id" ASC
  `);
  return serializeJob(job, items);
}

async function refreshJobStatus(db: Prisma.TransactionClient, restaurantId: number, jobId: bigint) {
  const rows = await db.$queryRaw<
    Array<{
      total: bigint;
      pending: bigint;
      running: bigint;
      failed: bigint;
      canceled: bigint;
      interrupted: bigint;
    }>
  >(Prisma.sql`
    SELECT
      COUNT(*)::bigint AS "total",
      COUNT(*) FILTER (WHERE "status" = 'PENDING')::bigint AS "pending",
      COUNT(*) FILTER (WHERE "status" = 'RUNNING')::bigint AS "running",
      COUNT(*) FILTER (WHERE "status" = 'FAILED')::bigint AS "failed",
      COUNT(*) FILTER (WHERE "status" = 'CANCELED')::bigint AS "canceled",
      COUNT(*) FILTER (WHERE "status" = 'MANUAL_REQUIRED' AND "result"->>'reason' = 'CLAIM_EXPIRED')::bigint AS "interrupted"
    FROM "RestaurantAiJobItem"
    WHERE "restaurantId" = ${restaurantId} AND "jobId" = ${jobId}
  `);
  const row = rows[0];
  const pending = Number(row?.pending || 0);
  const running = Number(row?.running || 0);
  const failed = Number(row?.failed || 0);
  const total = Number(row?.total || 0);
  const canceled = Number(row?.canceled || 0);
  const interrupted = Number(row?.interrupted || 0);
  if (pending || running) {
    await db.$executeRaw(Prisma.sql`
      UPDATE "RestaurantAiJob"
      SET "status" = CASE WHEN ${running} > 0 THEN 'RUNNING' ELSE 'PENDING' END,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "restaurantId" = ${restaurantId} AND "id" = ${jobId}
    `);
    return;
  }
  const finalStatus =
    interrupted > 0
      ? 'PARTIAL'
      : failed > 0
        ? failed === total
          ? 'FAILED'
          : 'PARTIAL'
        : canceled === total
          ? 'CANCELED'
          : 'COMPLETED';
  await db.$executeRaw(Prisma.sql`
    UPDATE "RestaurantAiJob"
    SET "status" = ${finalStatus}, "completedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "restaurantId" = ${restaurantId} AND "id" = ${jobId}
  `);
}

export class AiImageBatchJobService {
  estimate(input: unknown) {
    const parsed = enqueueSchema.parse(input);
    const unique = [...new Set(parsed.productIds)];
    return {
      productCount: unique.length,
      estimatedCreditUsd: Number((unique.length * ESTIMATED_IMAGE_COST_USD).toFixed(6)),
      estimateOnly: true,
      note: 'Estimativa máxima para itens elegíveis. Produtos com marca ou que já tenham imagem não geram nova imagem.',
    };
  }

  async enqueue(input: unknown, actor: Actor) {
    assertActor(actor);
    const parsed = enqueueSchema.parse(input);
    const productIds = [...new Set(parsed.productIds)].sort((a, b) => a - b);
    const restaurantId = Number(actor.restaurantId);
    await aiCreditService.assertAvailable(actor);

    return withTenantDbContext(restaurantId, async (db) => {
      const products = await db.product.findMany({
        where: { restaurantId, id: { in: productIds } },
        select: { id: true, name: true, image: true },
        orderBy: { id: 'asc' },
      });
      if (products.length !== productIds.length) {
        throw new Error('Um ou mais produtos não pertencem a este restaurante.');
      }
      const eligible = products.filter((product) => !String(product.image || '').trim());
      if (!eligible.length) throw new Error('Todos os produtos selecionados já possuem imagem.');
      const dedupeKey = stableBatchKey(
        actor,
        eligible.map((product) => product.id),
      );
      const estimated = Number((eligible.length * ESTIMATED_IMAGE_COST_USD).toFixed(6));
      const payload = JSON.stringify({ productIds: eligible.map((product) => product.id) });

      const jobs = await db.$queryRaw<JobRow[]>(Prisma.sql`
        INSERT INTO "RestaurantAiJob" (
          "restaurantId", "actorUserId", "kind", "status", "payload",
          "estimatedCreditUsd", "dedupeKey", "createdAt", "updatedAt"
        ) VALUES (
          ${restaurantId}, ${Number(actor.userId)}, 'PRODUCT_IMAGE_BATCH', 'PENDING',
          ${payload}::jsonb, ${estimated}, ${dedupeKey}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT ("restaurantId", "dedupeKey") DO UPDATE SET "updatedAt" = CURRENT_TIMESTAMP
        RETURNING
          "id", "publicId", "restaurantId", "actorUserId", "kind", "status",
          "estimatedCreditUsd", "actualCreditUsd", "attempts", "cancelRequested",
          "createdAt", "updatedAt", "completedAt"
      `);
      const job = jobs[0];
      for (const product of eligible) {
        const itemPayload = JSON.stringify({ productName: product.name });
        await db.$executeRaw(Prisma.sql`
          INSERT INTO "RestaurantAiJobItem" (
            "jobId", "restaurantId", "entityType", "entityId", "status", "payload", "dedupeKey"
          ) VALUES (
            ${job.id}, ${restaurantId}, 'PRODUCT', ${String(product.id)}, 'PENDING',
            ${itemPayload}::jsonb, ${`product:${product.id}`}
          )
          ON CONFLICT ("jobId", "dedupeKey") DO NOTHING
        `);
      }
      const complete = await readJob(db, restaurantId, job.publicId);
      if (!complete) throw new Error('Não foi possível criar o job de imagens.');
      return complete;
    });
  }

  async list(actor: Actor) {
    assertActor(actor);
    const restaurantId = Number(actor.restaurantId);
    return withTenantDbContext(restaurantId, async (db) => {
      const rows = await db.$queryRaw<JobRow[]>(Prisma.sql`
        SELECT
          "id", "publicId", "restaurantId", "actorUserId", "kind", "status",
          "estimatedCreditUsd", "actualCreditUsd", "attempts", "cancelRequested",
          "createdAt", "updatedAt", "completedAt"
        FROM "RestaurantAiJob"
        WHERE "restaurantId" = ${restaurantId} AND "kind" = 'PRODUCT_IMAGE_BATCH'
        ORDER BY "createdAt" DESC
        LIMIT 50
      `);
      const result = [];
      for (const row of rows) {
        const job = await readJob(db, restaurantId, row.publicId);
        if (job) result.push(job);
      }
      return result;
    });
  }

  async cancelItem(jobPublicIdInput: unknown, itemPublicIdInput: unknown, actor: Actor) {
    assertActor(actor);
    const restaurantId = Number(actor.restaurantId);
    const jobPublicId = String(jobPublicIdInput || '').trim();
    const itemPublicId = String(itemPublicIdInput || '').trim();
    return withTenantDbContext(restaurantId, async (db) => {
      const jobs = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        SELECT "id" FROM "RestaurantAiJob"
        WHERE "restaurantId" = ${restaurantId} AND "publicId" = ${jobPublicId} AND "kind" = 'PRODUCT_IMAGE_BATCH'
        LIMIT 1
        FOR UPDATE
      `);
      const jobId = jobs[0]?.id;
      if (!jobId) throw new Error('Job não encontrado.');
      const changed = await db.$executeRaw(Prisma.sql`
        UPDATE "RestaurantAiJobItem"
        SET "status" = 'CANCELED', "completedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "restaurantId" = ${restaurantId}
          AND "jobId" = ${jobId}
          AND "publicId" = ${itemPublicId}
          AND "status" = 'PENDING'
      `);
      if (changed !== 1) throw new Error('Apenas itens ainda não iniciados podem ser cancelados.');
      await refreshJobStatus(db, restaurantId, jobId);
      return readJob(db, restaurantId, jobPublicId);
    });
  }

  async retryFailures(jobPublicIdInput: unknown, actor: Actor) {
    assertActor(actor);
    const restaurantId = Number(actor.restaurantId);
    const jobPublicId = String(jobPublicIdInput || '').trim();
    await aiCreditService.assertAvailable(actor);
    return withTenantDbContext(restaurantId, async (db) => {
      const jobs = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        SELECT "id" FROM "RestaurantAiJob"
        WHERE "restaurantId" = ${restaurantId} AND "publicId" = ${jobPublicId} AND "kind" = 'PRODUCT_IMAGE_BATCH'
        LIMIT 1
        FOR UPDATE
      `);
      const jobId = jobs[0]?.id;
      if (!jobId) throw new Error('Job não encontrado.');
      const changed = await db.$executeRaw(Prisma.sql`
        UPDATE "RestaurantAiJobItem"
        SET "status" = 'PENDING', "error" = NULL, "startedAt" = NULL, "completedAt" = NULL,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "restaurantId" = ${restaurantId} AND "jobId" = ${jobId} AND "status" = 'FAILED'
      `);
      if (!changed) throw new Error('Este job não possui itens com falha para repetir.');
      await db.$executeRaw(Prisma.sql`
        UPDATE "RestaurantAiJob"
        SET "status" = 'PENDING', "completedAt" = NULL, "cancelRequested" = false,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "restaurantId" = ${restaurantId} AND "id" = ${jobId}
      `);
      return readJob(db, restaurantId, jobPublicId);
    });
  }
}

async function recoverExpiredClaims(db: Prisma.TransactionClient, restaurantId: number) {
  // A provider may already have billed or generated an image before the worker
  // stopped. Preserve reservations and require reconciliation instead of a retry.
  const recoveredJobs = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
    WITH expired_jobs AS (
      SELECT job."id"
      FROM "RestaurantAiJob" job
      WHERE job."restaurantId" = ${restaurantId}
        AND job."kind" = 'PRODUCT_IMAGE_BATCH'
        AND (job."lockedUntil" IS NULL OR job."lockedUntil" <= clock_timestamp())
        AND EXISTS (
          SELECT 1 FROM "RestaurantAiJobItem" item
          WHERE item."jobId" = job."id" AND item."restaurantId" = ${restaurantId}
            AND item."status" = 'RUNNING'
        )
      FOR UPDATE OF job SKIP LOCKED
    ), recovered_items AS (
      UPDATE "RestaurantAiJobItem" item
      SET "status" = 'MANUAL_REQUIRED',
          "result" = '{"status":"MANUAL_REQUIRED","reason":"CLAIM_EXPIRED"}'::jsonb,
          "error" = 'Processamento interrompido. Confira a imagem e o consumo de créditos com o suporte antes de gerar novamente.',
          "completedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      FROM expired_jobs
      WHERE item."jobId" = expired_jobs."id" AND item."restaurantId" = ${restaurantId}
        AND item."status" = 'RUNNING'
      RETURNING item."jobId"
    )
    UPDATE "RestaurantAiJob" job
    SET "lockedUntil" = NULL, "lockToken" = NULL, "updatedAt" = CURRENT_TIMESTAMP
    WHERE job."restaurantId" = ${restaurantId}
      AND job."id" IN (SELECT "jobId" FROM recovered_items)
    RETURNING job."id"
  `);
  for (const job of recoveredJobs) await refreshJobStatus(db, restaurantId, job.id);
}

export async function claimNextItem(restaurantId: number): Promise<ClaimedItem | null> {
  return withTenantDbContext(restaurantId, async (db) => {
    await recoverExpiredClaims(db, restaurantId);
    const lockToken = crypto.randomUUID();
    const rows = await db.$queryRaw<ClaimedItem[]>(Prisma.sql`
      WITH candidate AS (
        SELECT item."id", item."jobId"
        FROM "RestaurantAiJobItem" item
        JOIN "RestaurantAiJob" job ON job."id" = item."jobId"
        WHERE item."restaurantId" = ${restaurantId}
          AND job."restaurantId" = ${restaurantId}
          AND job."kind" = 'PRODUCT_IMAGE_BATCH'
          AND job."cancelRequested" = false
          AND item."status" = 'PENDING'
          AND (job."lockedUntil" IS NULL OR job."lockedUntil" <= clock_timestamp())
        ORDER BY item."id" ASC
        LIMIT 1
        FOR UPDATE OF job, item SKIP LOCKED
      ), updated_item AS (
        UPDATE "RestaurantAiJobItem" item
        SET "status" = 'RUNNING', "attempts" = item."attempts" + 1,
            "startedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
        FROM candidate
        WHERE item."id" = candidate."id" AND item."restaurantId" = ${restaurantId}
        RETURNING item."id", item."publicId", item."jobId", item."restaurantId", item."entityId"
      ), updated_job AS (
        UPDATE "RestaurantAiJob" job
        SET "status" = 'RUNNING', "lockedUntil" = clock_timestamp() + (${LOCK_MS} * INTERVAL '1 millisecond'), "lockToken" = ${lockToken}::uuid,
            "attempts" = job."attempts" + 1, "updatedAt" = CURRENT_TIMESTAMP
        FROM updated_item
        WHERE job."id" = updated_item."jobId" AND job."restaurantId" = ${restaurantId}
        RETURNING job."id", job."publicId", job."actorUserId", job."lockToken"
      )
      SELECT
        updated_job."id" AS "jobId",
        updated_job."publicId" AS "jobPublicId",
        updated_item."id" AS "itemId",
        updated_item."publicId" AS "itemPublicId",
        updated_item."restaurantId" AS "restaurantId",
        updated_job."actorUserId" AS "actorUserId",
        updated_item."entityId" AS "entityId",
        updated_job."lockToken" AS "lockToken"
      FROM updated_item
      JOIN updated_job ON updated_job."id" = updated_item."jobId"
    `);
    return rows[0] ?? null;
  });
}

export async function finishClaim(
  claim: ClaimedItem,
  result: unknown,
  error?: unknown,
  costUsd = 0,
) {
  const restaurantId = claim.restaurantId;
  return withTenantDbContext(restaurantId, async (db) => {
    // Lock the parent before the item, as claim/recovery do. A stale worker must
    // not finish another claim, increment its cost, or release its lease.
    const owned = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT "id" FROM "RestaurantAiJob"
      WHERE "restaurantId" = ${restaurantId} AND "id" = ${claim.jobId}
        AND "kind" = 'PRODUCT_IMAGE_BATCH' AND "lockToken" = ${claim.lockToken}::uuid
        AND "lockedUntil" > clock_timestamp()
      FOR UPDATE
    `);
    if (!owned.length) return false;
    const normalizedStatus = error
      ? 'FAILED'
      : (result as { status?: string })?.status === 'MANUAL_REQUIRED'
        ? 'MANUAL_REQUIRED'
        : (result as { status?: string })?.status === 'ALREADY_HAS_IMAGE'
          ? 'SKIPPED'
          : 'COMPLETED';
    const resultJson = JSON.stringify(result ?? {});
    const errorMessage = error ? publicAiFailure(error) : null;
    const completed = await db.$executeRaw(Prisma.sql`
      UPDATE "RestaurantAiJobItem"
      SET "status" = ${normalizedStatus}, "result" = ${resultJson}::jsonb, "error" = ${errorMessage},
          "completedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "restaurantId" = ${restaurantId} AND "id" = ${claim.itemId}
        AND "jobId" = ${claim.jobId} AND "status" = 'RUNNING'
    `);
    if (completed !== 1) return false;
    const recordedCost = !error && Number.isFinite(costUsd) && costUsd > 0 ? costUsd : 0;
    await db.$executeRaw(Prisma.sql`
      UPDATE "RestaurantAiJob"
      SET "actualCreditUsd" = "actualCreditUsd" + ${recordedCost},
          "lockedUntil" = NULL, "lockToken" = NULL, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "restaurantId" = ${restaurantId} AND "id" = ${claim.jobId}
        AND "lockToken" = ${claim.lockToken}::uuid
    `);
    await refreshJobStatus(db, restaurantId, claim.jobId);
    return true;
  });
}

export async function drainAiImageJobs() {
  const restaurants = await prisma.restaurant.findMany({
    select: { id: true },
    orderBy: { id: 'asc' },
    take: 5000,
  });
  let processed = 0;
  for (const restaurant of restaurants) {
    const claim = await claimNextItem(restaurant.id);
    if (!claim) continue;
    processed += 1;
    try {
      const actor = await withTenantDbContext(claim.restaurantId, (db) =>
        db.user.findFirst({
          where: {
            id: claim.actorUserId,
            restaurantId: claim.restaurantId,
            role: 'ADMIN',
            active: true,
          },
          select: { id: true, email: true, role: true },
        }),
      );
      if (!actor) throw new Error('ADMIN responsável pelo job não está mais ativo.');
      const result = await generateImportedProductImageService.execute(
        Number(claim.entityId),
        claim.restaurantId,
        { userId: actor.id, restaurantId: claim.restaurantId },
      );
      const usage = (result as { aiUsage?: { model?: string; costUsd?: number; usage?: unknown } })
        .aiUsage;
      if (usage?.costUsd && usage.model) {
        const balance = await aiCreditService.getBalance({
          userId: actor.id,
          restaurantId: claim.restaurantId,
        });
        await finishClaim(
          claim,
          { ...result, credits: { remainingUsd: balance.remainingUsd } },
          undefined,
          usage.costUsd,
        );
      } else {
        await finishClaim(claim, result);
      }
    } catch (error) {
      await finishClaim(claim, {}, error);
    }
  }
  return { processed };
}

export default new AiImageBatchJobService();
