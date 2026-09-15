import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import createProductService from '../../products/services/CreateProductService.js';
import updateProductService from '../../products/services/UpdateProductService.js';
import { sanitizeAdminAiContext } from '../domain/adminAiSecurityPolicy.js';

type Actor = {
  userId: number;
  restaurantId: number;
  userName?: string | null;
  userRole?: string | null;
};

type ActionRow = {
  publicId: string;
  actionType: string;
  status: string;
  proposal: unknown;
  approvalSnapshot: unknown;
  result: unknown;
  error: string | null;
  createdAt: Date;
  approvedAt: Date | null;
  executedAt: Date | null;
  canceledAt: Date | null;
};

const createProductProposalSchema = z.object({
  actionType: z.literal('CREATE_PRODUCT'),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).nullable().optional(),
  price: z.number().positive().max(100000),
  categoryId: z.number().int().positive().optional(),
  categoryName: z.string().trim().min(1).max(120).optional(),
  active: z.boolean().optional().default(true),
});

const adjustPricesProposalSchema = z.object({
  actionType: z.literal('ADJUST_PRODUCT_PRICES'),
  productIds: z.array(z.number().int().positive()).min(1).max(100).optional(),
  categoryId: z.number().int().positive().optional(),
  categoryName: z.string().trim().min(1).max(120).optional(),
  nameContains: z.string().trim().min(1).max(120).optional(),
  deltaAmount: z.number().min(-100000).max(100000).optional(),
  percent: z.number().min(-100).max(1000).optional(),
}).refine((value) => value.deltaAmount !== undefined || value.percent !== undefined, {
  message: 'Informe o reajuste em valor ou percentual.',
}).refine((value) => value.productIds?.length || value.categoryId || value.categoryName || value.nameContains, {
  message: 'Informe quais produtos serão reajustados.',
});

const proposalSchema = z.discriminatedUnion('actionType', [
  createProductProposalSchema,
  adjustPricesProposalSchema,
]);

type Proposal = z.infer<typeof proposalSchema>;

function assertActor(actor: Actor) {
  if (
    String(actor.userRole || '').toUpperCase() !== 'ADMIN' ||
    !Number.isSafeInteger(Number(actor.userId)) ||
    Number(actor.userId) <= 0 ||
    !Number.isSafeInteger(Number(actor.restaurantId)) ||
    Number(actor.restaurantId) <= 0
  ) {
    throw new Error('Conta ADMIN inválida para propor ações.');
  }
}

function stableKey(actor: Actor, proposal: Proposal) {
  const serialized = JSON.stringify(sanitizeAdminAiContext(proposal));
  return `admin-ai:${actor.userId}:${crypto.createHash('sha256').update(serialized).digest('hex')}`;
}

function serialize(row: ActionRow) {
  return {
    publicId: row.publicId,
    actionType: row.actionType,
    status: row.status,
    proposal: sanitizeAdminAiContext(row.proposal),
    approvalSnapshot: sanitizeAdminAiContext(row.approvalSnapshot),
    result: sanitizeAdminAiContext(row.result),
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    executedAt: row.executedAt?.toISOString() ?? null,
    canceledAt: row.canceledAt?.toISOString() ?? null,
  };
}

async function readAction(db: Prisma.TransactionClient, restaurantId: number, publicId: string) {
  const rows = await db.$queryRaw<ActionRow[]>(Prisma.sql`
    SELECT
      "publicId", "actionType", "status", "proposal", "approvalSnapshot", "result", "error",
      "createdAt", "approvedAt", "executedAt", "canceledAt"
    FROM "RestaurantAiAction"
    WHERE "restaurantId" = ${restaurantId} AND "publicId" = ${publicId}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

async function resolveCategory(
  db: Prisma.TransactionClient,
  restaurantId: number,
  proposal: { categoryId?: number; categoryName?: string },
) {
  const category = proposal.categoryId
    ? await db.category.findFirst({
        where: { id: proposal.categoryId, restaurantId },
        select: { id: true, name: true },
      })
    : proposal.categoryName
      ? await db.category.findFirst({
          where: {
            restaurantId,
            name: { equals: proposal.categoryName, mode: 'insensitive' },
          },
          select: { id: true, name: true },
        })
      : null;
  if (!category) throw new Error('Selecione uma categoria existente antes de aprovar esta ação.');
  return category;
}

async function buildPreview(db: Prisma.TransactionClient, restaurantId: number, proposal: Proposal) {
  if (proposal.actionType === 'CREATE_PRODUCT') {
    const category = await resolveCategory(db, restaurantId, proposal);
    const existing = await db.product.findFirst({
      where: { restaurantId, name: { equals: proposal.name, mode: 'insensitive' } },
      select: { id: true, name: true, price: true },
    });
    if (existing) {
      throw new Error(`Já existe um produto chamado “${existing.name}”. Revise antes de criar outro.`);
    }
    return {
      actionType: proposal.actionType,
      exactAction: {
        name: proposal.name,
        description: proposal.description ?? null,
        price: Number(proposal.price.toFixed(2)),
        categoryId: category.id,
        categoryName: category.name,
        active: proposal.active,
      },
      affectedRecords: 1,
    };
  }

  const category = proposal.categoryId || proposal.categoryName
    ? await resolveCategory(db, restaurantId, proposal)
    : null;
  const products = await db.product.findMany({
    where: {
      restaurantId,
      ...(proposal.productIds?.length ? { id: { in: proposal.productIds } } : {}),
      ...(category ? { categoryId: category.id } : {}),
      ...(proposal.nameContains
        ? { name: { contains: proposal.nameContains, mode: 'insensitive' } }
        : {}),
    },
    select: { id: true, name: true, price: true, categoryId: true, configurationVersion: true },
    orderBy: { name: 'asc' },
    take: 100,
  });
  if (!products.length) throw new Error('Nenhum produto corresponde ao filtro informado.');

  const changes = products.map((product) => {
    const before = Number(product.price);
    const next = proposal.deltaAmount !== undefined
      ? before + proposal.deltaAmount
      : before * (1 + Number(proposal.percent || 0) / 100);
    if (!Number.isFinite(next) || next <= 0 || next > 100000) {
      throw new Error(`O reajuste deixaria “${product.name}” com preço inválido.`);
    }
    return {
      productId: product.id,
      name: product.name,
      categoryId: product.categoryId,
      configurationVersion: product.configurationVersion,
      before: Number(before.toFixed(2)),
      after: Number(next.toFixed(2)),
    };
  });

  return {
    actionType: proposal.actionType,
    filter: {
      productIds: proposal.productIds ?? null,
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? null,
      nameContains: proposal.nameContains ?? null,
      deltaAmount: proposal.deltaAmount ?? null,
      percent: proposal.percent ?? null,
    },
    affectedRecords: changes.length,
    changes,
  };
}

export class AdminAiActionService {
  async propose(input: unknown, actor: Actor) {
    assertActor(actor);
    const proposal = proposalSchema.parse(input);
    const restaurantId = Number(actor.restaurantId);
    const idempotencyKey = stableKey(actor, proposal);

    return withTenantDbContext(restaurantId, async (db) => {
      const preview = await buildPreview(db, restaurantId, proposal);
      const proposalJson = JSON.stringify(sanitizeAdminAiContext(proposal));
      const previewJson = JSON.stringify(sanitizeAdminAiContext(preview));
      const rows = await db.$queryRaw<ActionRow[]>(Prisma.sql`
        INSERT INTO "RestaurantAiAction" (
          "restaurantId", "actorUserId", "actionType", "status", "proposal", "approvalSnapshot", "idempotencyKey"
        ) VALUES (
          ${restaurantId}, ${Number(actor.userId)}, ${proposal.actionType}, 'PROPOSED',
          ${proposalJson}::jsonb, ${previewJson}::jsonb, ${idempotencyKey}
        )
        ON CONFLICT ("restaurantId", "idempotencyKey") DO UPDATE SET
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING
          "publicId", "actionType", "status", "proposal", "approvalSnapshot", "result", "error",
          "createdAt", "approvedAt", "executedAt", "canceledAt"
      `);
      return serialize(rows[0]);
    });
  }

  async list(actor: Actor) {
    assertActor(actor);
    const restaurantId = Number(actor.restaurantId);
    return withTenantDbContext(restaurantId, async (db) => {
      const rows = await db.$queryRaw<ActionRow[]>(Prisma.sql`
        SELECT
          "publicId", "actionType", "status", "proposal", "approvalSnapshot", "result", "error",
          "createdAt", "approvedAt", "executedAt", "canceledAt"
        FROM "RestaurantAiAction"
        WHERE "restaurantId" = ${restaurantId}
        ORDER BY "createdAt" DESC
        LIMIT 100
      `);
      return rows.map(serialize);
    });
  }

  async cancel(publicIdInput: unknown, actor: Actor) {
    assertActor(actor);
    const publicId = String(publicIdInput || '').trim();
    if (!publicId) throw new Error('Ação inválida.');
    const restaurantId = Number(actor.restaurantId);
    return withTenantDbContext(restaurantId, async (db) => {
      await db.$executeRaw(Prisma.sql`
        UPDATE "RestaurantAiAction"
        SET "status" = 'CANCELED', "canceledAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "restaurantId" = ${restaurantId}
          AND "publicId" = ${publicId}
          AND "status" IN ('PROPOSED', 'APPROVED')
      `);
      const action = await readAction(db, restaurantId, publicId);
      if (!action) throw new Error('Ação não encontrada.');
      return serialize(action);
    });
  }

  async approveAndExecute(publicIdInput: unknown, actor: Actor) {
    assertActor(actor);
    const publicId = String(publicIdInput || '').trim();
    if (!publicId) throw new Error('Ação inválida.');
    const restaurantId = Number(actor.restaurantId);

    const action = await withTenantDbContext(restaurantId, async (db) => {
      const current = await readAction(db, restaurantId, publicId);
      if (!current) throw new Error('Ação não encontrada.');
      if (current.status === 'EXECUTED') return current;
      if (current.status !== 'PROPOSED') {
        throw new Error('Esta ação não está disponível para aprovação.');
      }
      const proposal = proposalSchema.parse(current.proposal);
      const freshPreview = await buildPreview(db, restaurantId, proposal);
      const previousPreview = JSON.stringify(sanitizeAdminAiContext(current.approvalSnapshot));
      const freshPreviewJson = JSON.stringify(sanitizeAdminAiContext(freshPreview));
      if (previousPreview !== freshPreviewJson) {
        throw new Error('Os dados mudaram desde a prévia. Gere uma nova proposta antes de aprovar.');
      }
      const changed = await db.$executeRaw(Prisma.sql`
        UPDATE "RestaurantAiAction"
        SET
          "status" = 'APPROVED',
          "approvedByUserId" = ${Number(actor.userId)},
          "approvedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "restaurantId" = ${restaurantId}
          AND "publicId" = ${publicId}
          AND "status" = 'PROPOSED'
      `);
      if (changed !== 1) throw new Error('A ação foi atualizada por outra sessão.');
      return { ...current, status: 'APPROVED', proposal, approvalSnapshot: freshPreview };
    });

    if (action.status === 'EXECUTED') return serialize(action);
    const proposal = proposalSchema.parse(action.proposal);
    try {
      let result: unknown;
      if (proposal.actionType === 'CREATE_PRODUCT') {
        const preview = action.approvalSnapshot as { exactAction?: { categoryId?: number } };
        const categoryId = Number(preview?.exactAction?.categoryId || 0);
        if (!categoryId) throw new Error('Categoria da ação não está mais disponível.');
        result = await createProductService.execute(
          {
            name: proposal.name,
            description: proposal.description ?? null,
            image: null,
            price: proposal.price,
            categoryId,
            active: proposal.active,
            featured: false,
            saleMode: 'COMPLETE',
          },
          restaurantId,
          {
            userId: Number(actor.userId),
            userName: actor.userName || undefined,
            userRole: actor.userRole || undefined,
          },
        );
      } else {
        const preview = action.approvalSnapshot as {
          changes?: Array<{ productId: number; after: number; configurationVersion: number }>;
        };
        const changes = Array.isArray(preview?.changes) ? preview.changes : [];
        const updated: unknown[] = [];
        for (const change of changes) {
          updated.push(
            await updateProductService.execute(
              change.productId,
              { price: change.after, expectedConfigurationVersion: change.configurationVersion },
              restaurantId,
              {
                userId: Number(actor.userId),
                userName: actor.userName || undefined,
                userRole: actor.userRole || undefined,
              },
            ),
          );
        }
        result = { updatedProducts: updated.length };
      }

      return withTenantDbContext(restaurantId, async (db) => {
        const resultJson = JSON.stringify(sanitizeAdminAiContext(result));
        await db.$executeRaw(Prisma.sql`
          UPDATE "RestaurantAiAction"
          SET
            "status" = 'EXECUTED',
            "result" = ${resultJson}::jsonb,
            "executedAt" = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "restaurantId" = ${restaurantId}
            AND "publicId" = ${publicId}
            AND "status" = 'APPROVED'
        `);
        const executed = await readAction(db, restaurantId, publicId);
        if (!executed) throw new Error('Não foi possível carregar a ação executada.');
        return serialize(executed);
      });
    } catch (error) {
      await withTenantDbContext(restaurantId, async (db) => {
        const message = error instanceof Error ? error.message.slice(0, 1000) : 'Falha ao executar ação.';
        await db.$executeRaw(Prisma.sql`
          UPDATE "RestaurantAiAction"
          SET "status" = 'FAILED', "error" = ${message}, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "restaurantId" = ${restaurantId}
            AND "publicId" = ${publicId}
            AND "status" = 'APPROVED'
        `);
      });
      throw error;
    }
  }
}

export default new AdminAiActionService();
