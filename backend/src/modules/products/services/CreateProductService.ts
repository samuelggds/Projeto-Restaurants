import {
  createProductSchema,
  productConfigurationTemplateDataSchema,
} from '../../../validators/ProductValidator.js';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import {
  buildProductCompositionCreate,
  buildProductOptionGroupsCreate,
} from '../utils/productOptionGroups.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';

type CreateProductInput = z.infer<typeof createProductSchema>;
type Actor = { userId?: number; userName?: string; userRole?: string };

function requireDefined<T>(value: T | null | undefined, message: string): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value as NonNullable<T>;
}

class CreateProductService {
  async execute(data: CreateProductInput, restaurantId: number, actor: Actor = {}) {
    if (!restaurantId) {
      throw new Error('Restaurante não encontrado');
    }

    const parsedData = createProductSchema.parse(data);

    const normalizedStock =
      parsedData.stock === null || parsedData.stock === undefined ? null : Number(parsedData.stock);
    const activeFromStock = normalizedStock === null || normalizedStock > 0;

    const requiredName = requireDefined(parsedData.name, 'Nome do produto é obrigatório.');
    const requiredPrice = requireDefined(parsedData.price, 'Preço do produto é obrigatório.');
    const requiredCategoryId = requireDefined(
      parsedData.categoryId,
      'Categoria do produto é obrigatória.',
    );

    const {
      ingredients: _legacyIngredients,
      optionGroups = [],
      saleMode,
      compositionItems = [],
      portionConfiguration,
      templateId,
      ...productData
    } = parsedData;
    const effectiveSaleMode =
      saleMode ?? (optionGroups.length > 0 || templateId ? 'BUILDABLE' : 'COMPLETE');
    if (effectiveSaleMode === 'BUILDABLE' && optionGroups.length === 0 && !templateId) {
      throw new Error('Adicione ao menos um grupo de opções para montar o produto.');
    }

    const product = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      const category = await tx.category.findFirst({
        where: { id: requiredCategoryId, restaurantId },
        select: { id: true },
      });

      if (!category) {
        throw new Error('A categoria informada não pertence a este restaurante.');
      }

      const template = templateId
        ? await tx.productConfigurationTemplate.findFirst({
            where: { id: templateId, restaurantId, active: true },
          })
        : null;
      if (templateId && !template) {
        throw new Error('Modelo de personalização não encontrado neste restaurante.');
      }
      const templateConfiguration = template
        ? productConfigurationTemplateDataSchema.parse(template.configuration)
        : null;
      const configuredGroups =
        parsedData.optionGroups !== undefined
          ? optionGroups
          : (templateConfiguration?.optionGroups ?? []);
      const configuredComposition =
        parsedData.compositionItems !== undefined
          ? compositionItems
          : (templateConfiguration?.compositionItems ?? []);
      const configuredPortions =
        parsedData.portionConfiguration !== undefined
          ? portionConfiguration
          : templateConfiguration?.portionConfiguration;

      if (effectiveSaleMode === 'BUILDABLE' && configuredGroups.length === 0) {
        throw new Error('Adicione ao menos um grupo de opções para montar o produto.');
      }

      const normalizedGroups =
        effectiveSaleMode === 'BUILDABLE'
          ? await buildProductOptionGroupsCreate(tx, restaurantId, configuredGroups)
          : [];
      const normalizedComposition =
        effectiveSaleMode === 'BUILDABLE'
          ? await buildProductCompositionCreate(tx, restaurantId, configuredComposition)
          : [];

      const createdProduct = await tx.product.create({
        data: {
          ...productData,
          name: requiredName,
          price: requiredPrice,
          categoryId: requiredCategoryId,
          restaurantId,
          saleMode: effectiveSaleMode,
          active: activeFromStock && parsedData.active !== false,
          ...(normalizedGroups.length > 0 ? { optionGroups: { create: normalizedGroups } } : {}),
          ...(normalizedComposition.length > 0
            ? { compositionItems: { create: normalizedComposition } }
            : {}),
        },
        include: {
          category: true,
          compositionItems: {
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            include: { ingredient: true },
          },
          optionGroups: {
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            include: {
              options: {
                orderBy: [{ position: 'asc' }, { id: 'asc' }],
                include: { ingredient: true },
              },
            },
          },
        },
      });

      if (effectiveSaleMode === 'BUILDABLE' && configuredPortions?.enabled) {
        const optionGroup = createdProduct.optionGroups.find(
          (group) => group.name === configuredPortions.optionGroupName,
        );
        if (!optionGroup) {
          throw new Error('A etapa usada nas porções não foi encontrada neste produto.');
        }
        await tx.productPortionConfiguration.create({
          data: {
            restaurantId,
            productId: createdProduct.id,
            optionGroupId: optionGroup.id,
            enabled: true,
            minPortions: configuredPortions.minPortions,
            maxPortions: configuredPortions.maxPortions,
            pricingStrategy: configuredPortions.pricingStrategy,
            allowPortionObservations: configuredPortions.allowPortionObservations,
          },
        });
      }

      if (template) {
        await tx.auditLog.create({
          data: {
            restaurantId,
            userId: actor.userId,
            userName: actor.userName,
            userRole: actor.userRole,
            action: 'PRODUCT_TEMPLATE_APPLIED',
            resource: 'Product',
            metadata: { productId: createdProduct.id, templateId: template.id },
          },
        });
      }

      if (actor.userId || actor.userName) {
        await tx.auditLog.create({
          data: {
            restaurantId,
            userId: actor.userId,
            userName: actor.userName,
            userRole: actor.userRole,
            action: 'PRODUCT_CREATED',
            resource: 'Product',
            metadata: {
              productId: createdProduct.id,
              saleMode: effectiveSaleMode,
              basePrice: Number(requiredPrice),
              optionGroupCount: normalizedGroups.length,
              compositionItemCount: normalizedComposition.length,
              hasPortions: Boolean(configuredPortions?.enabled),
              templateId: template?.id ?? null,
            },
          },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id_restaurantId: { id: createdProduct.id, restaurantId } },
        include: {
          category: true,
          compositionItems: {
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            include: { ingredient: true },
          },
          portionConfiguration: true,
          optionGroups: {
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            include: {
              options: {
                orderBy: [{ position: 'asc' }, { id: 'asc' }],
                include: { ingredient: true },
              },
            },
          },
        },
      });
    });

    return {
      product,
    };
  }
}

export default new CreateProductService();
