import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { productConfigurationTemplateDataSchema } from '../../../validators/ProductValidator.js';
import {
  buildProductCompositionCreate,
  buildProductOptionGroupsCreate,
} from '../../products/utils/productOptionGroups.js';

const templateInputSchema = z.object({
  name: z.string().trim().min(1, 'Nome do modelo é obrigatório.').max(80),
  description: z.string().trim().max(240).nullable().optional(),
  configuration: productConfigurationTemplateDataSchema,
});

const updateTemplateInputSchema = templateInputSchema.partial();

type TemplateInput = z.infer<typeof templateInputSchema>;
type UpdateTemplateInput = z.infer<typeof updateTemplateInputSchema>;
type Actor = { userId?: number; userName?: string; userRole?: string };

function tenantId(value: number) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new Error('Restaurante não encontrado.');
  }
  return normalized;
}

async function normalizeConfiguration(
  db: Prisma.TransactionClient,
  restaurantId: number,
  configuration: z.infer<typeof productConfigurationTemplateDataSchema>,
) {
  const parsed = productConfigurationTemplateDataSchema.parse(configuration);
  const groups = await buildProductOptionGroupsCreate(db, restaurantId, parsed.optionGroups);
  const composition = await buildProductCompositionCreate(
    db,
    restaurantId,
    parsed.compositionItems,
  );

  return {
    optionGroups: groups.map((group) => ({
      name: group.name,
      description: group.description || undefined,
      required: group.required,
      selectionType: group.selectionType,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      options: group.options.create.map((option) => ({
        ingredientId: option.ingredientId,
        additionalPrice: Number(option.additionalPrice),
        pricingMode: option.pricingMode,
        absolutePrice: option.absolutePrice === null ? null : Number(option.absolutePrice),
        allowQuantity: option.allowQuantity,
        minQuantity: option.minQuantity,
        maxQuantity: option.maxQuantity,
        defaultQuantity: option.defaultQuantity,
        defaultSelected: option.defaultSelected,
        locked: option.locked,
        active: option.active,
      })),
    })),
    compositionItems: composition.map((item) => ({
      ingredientId: item.ingredientId,
      removable: item.removable,
      active: item.active,
    })),
    portionConfiguration: parsed.portionConfiguration || null,
  };
}

async function audit(
  db: Prisma.TransactionClient,
  restaurantId: number,
  action: string,
  templateId: number,
  actor: Actor,
) {
  await db.auditLog.create({
    data: {
      restaurantId,
      userId: actor.userId,
      userName: actor.userName,
      userRole: actor.userRole,
      action,
      resource: 'ProductConfigurationTemplate',
      metadata: { templateId },
    },
  });
}

class ProductConfigurationTemplateService {
  async list(restaurantId: number) {
    const normalizedRestaurantId = tenantId(restaurantId);
    return withTenantDbContext(normalizedRestaurantId, (db) =>
      db.productConfigurationTemplate.findMany({
        where: { restaurantId: normalizedRestaurantId, active: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
    );
  }

  async create(input: TemplateInput, restaurantId: number, actor: Actor = {}) {
    const normalizedRestaurantId = tenantId(restaurantId);
    const parsed = templateInputSchema.parse(input);
    return withTenantDbContext(normalizedRestaurantId, async (db) => {
      const duplicate = await db.productConfigurationTemplate.findFirst({
        where: {
          restaurantId: normalizedRestaurantId,
          name: { equals: parsed.name, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new Error('Já existe um modelo com este nome neste restaurante.');
      }
      const configuration = await normalizeConfiguration(
        db,
        normalizedRestaurantId,
        parsed.configuration,
      );
      const template = await db.productConfigurationTemplate.create({
        data: {
          restaurantId: normalizedRestaurantId,
          name: parsed.name,
          description: parsed.description || null,
          configuration: configuration as Prisma.InputJsonValue,
        },
      });
      await audit(db, normalizedRestaurantId, 'PRODUCT_TEMPLATE_CREATED', template.id, actor);
      return template;
    });
  }

  async update(id: number, input: UpdateTemplateInput, restaurantId: number, actor: Actor = {}) {
    const normalizedRestaurantId = tenantId(restaurantId);
    const templateId = Number(id);
    const parsed = updateTemplateInputSchema.parse(input);
    return withTenantDbContext(normalizedRestaurantId, async (db) => {
      const existing = await db.productConfigurationTemplate.findFirst({
        where: { id: templateId, restaurantId: normalizedRestaurantId, active: true },
      });
      if (!existing) {
        throw new Error('Modelo não encontrado neste restaurante.');
      }
      if (parsed.name !== undefined) {
        const duplicate = await db.productConfigurationTemplate.findFirst({
          where: {
            restaurantId: normalizedRestaurantId,
            id: { not: templateId },
            name: { equals: parsed.name, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (duplicate) {
          throw new Error('Já existe um modelo com este nome neste restaurante.');
        }
      }
      const configuration = parsed.configuration
        ? await normalizeConfiguration(db, normalizedRestaurantId, parsed.configuration)
        : undefined;
      const template = await db.productConfigurationTemplate.update({
        where: { id_restaurantId: { id: templateId, restaurantId: normalizedRestaurantId } },
        data: {
          ...(parsed.name !== undefined ? { name: parsed.name } : {}),
          ...(parsed.description !== undefined ? { description: parsed.description || null } : {}),
          ...(configuration ? { configuration: configuration as Prisma.InputJsonValue } : {}),
        },
      });
      await audit(db, normalizedRestaurantId, 'PRODUCT_TEMPLATE_UPDATED', template.id, actor);
      return template;
    });
  }

  async deactivate(id: number, restaurantId: number, actor: Actor = {}) {
    const normalizedRestaurantId = tenantId(restaurantId);
    const templateId = Number(id);
    return withTenantDbContext(normalizedRestaurantId, async (db) => {
      const updated = await db.productConfigurationTemplate.updateMany({
        where: { id: templateId, restaurantId: normalizedRestaurantId, active: true },
        data: { active: false },
      });
      if (updated.count !== 1) {
        throw new Error('Modelo não encontrado neste restaurante.');
      }
      await audit(db, normalizedRestaurantId, 'PRODUCT_TEMPLATE_DEACTIVATED', templateId, actor);
      return { message: 'Modelo removido com sucesso.' };
    });
  }
}

export default new ProductConfigurationTemplateService();
