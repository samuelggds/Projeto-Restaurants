import { updateProductSchema } from '../../../validators/ProductValidator.js';
import productRepository from '../repositories/ProductRepository.js';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import {
  buildProductCompositionCreate,
  buildProductOptionGroupsCreate,
} from '../utils/productOptionGroups.js';
import { isPublicProductMediaReference } from '../../publicMedia/utils/publicMediaReference.js';
import { setTenantDbContext, withTenantDbContext } from '../../../database/tenantDbContext.js';

type UpdateProductInput = z.infer<typeof updateProductSchema>;
type Actor = { userId?: number; userName?: string; userRole?: string };

function isOptimisticUpdateConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2025');
}

class UpdateProductService {
  async execute(
    id: number | string,
    data: UpdateProductInput,
    restaurantId: number,
    actor: Actor = {},
  ) {
    const parsedData = updateProductSchema.parse(data);

    const product = await withTenantDbContext(restaurantId, (db) =>
      productRepository.findById(id, restaurantId, db),
    );

    if (!product) {
      throw new Error('Produto não encontrado!');
    }

    const stockWasProvided = Object.prototype.hasOwnProperty.call(data, 'stock');
    const normalizedStock =
      parsedData.stock === null || parsedData.stock === undefined ? null : Number(parsedData.stock);

    let nextActive = parsedData.active;

    if (stockWasProvided) {
      nextActive = normalizedStock === null || normalizedStock > 0;
    }

    const payload: UpdateProductInput = {
      ...parsedData,
      active: nextActive,
    };
    const {
      ingredients: _legacyIngredients,
      optionGroups,
      saleMode,
      confirmDiscardConfiguration,
      compositionItems,
      portionConfiguration,
      templateId: _templateId,
      expectedConfigurationVersion,
      ...productData
    } = payload;
    const effectiveSaleMode =
      saleMode ?? (optionGroups !== undefined ? 'BUILDABLE' : (product.saleMode ?? 'BUILDABLE'));
    const persistedProductData = {
      ...productData,
      ...(isPublicProductMediaReference(productData.image, restaurantId, Number(product.id))
        ? { image: product.image || '' }
        : {}),
    };
    if (effectiveSaleMode === 'BUILDABLE' && optionGroups && optionGroups.length === 0) {
      throw new Error('Adicione ao menos um grupo de opções para montar o produto.');
    }

    if (
      effectiveSaleMode === 'BUILDABLE' &&
      optionGroups === undefined &&
      product.optionGroups?.length === 0
    ) {
      throw new Error('Adicione ao menos um grupo de opções para montar o produto.');
    }
    if (
      effectiveSaleMode === 'COMPLETE' &&
      product.saleMode === 'BUILDABLE' &&
      product.optionGroups.length > 0 &&
      confirmDiscardConfiguration !== true
    ) {
      throw new Error(
        'Confirme a remoção das etapas de personalização para vender este produto como simples.',
      );
    }

    try {
      return await prisma.$transaction(async (tx) => {
        await setTenantDbContext(tx, restaurantId);
        if (persistedProductData.categoryId !== undefined) {
          const category = await tx.category.findFirst({
            where: { id: persistedProductData.categoryId, restaurantId },
            select: { id: true },
          });

          if (!category) {
            throw new Error('A categoria informada não pertence a este restaurante.');
          }
        }

        const normalizedGroups =
          optionGroups && effectiveSaleMode === 'BUILDABLE'
            ? await buildProductOptionGroupsCreate(tx, restaurantId, optionGroups)
            : null;
        const normalizedComposition = compositionItems
          ? await buildProductCompositionCreate(tx, restaurantId, compositionItems)
          : null;

        if (normalizedGroups || effectiveSaleMode === 'COMPLETE') {
          await tx.productOptionGroup.deleteMany({
            where: { productId: product.id, restaurantId },
          });
        }
        if (normalizedComposition || effectiveSaleMode === 'COMPLETE') {
          await tx.productCompositionItem.deleteMany({
            where: { productId: product.id, restaurantId },
          });
        }
        if (portionConfiguration !== undefined || effectiveSaleMode === 'COMPLETE') {
          await tx.productPortionConfiguration.deleteMany({
            where: { productId: product.id, restaurantId },
          });
        }

        const updatedProduct = await tx.product.update({
          where: {
            id: product.id,
            restaurantId,
            ...(expectedConfigurationVersion
              ? { configurationVersion: expectedConfigurationVersion }
              : {}),
          },
          data: {
            ...persistedProductData,
            saleMode: effectiveSaleMode,
            configurationVersion: { increment: 1 },
            ...(normalizedGroups ? { optionGroups: { create: normalizedGroups } } : {}),
            ...(normalizedComposition
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

        if (effectiveSaleMode === 'BUILDABLE' && portionConfiguration?.enabled) {
          const optionGroup = updatedProduct.optionGroups.find(
            (group) => group.name === portionConfiguration.optionGroupName,
          );
          if (!optionGroup) {
            throw new Error('A etapa usada nas porções não foi encontrada neste produto.');
          }
          await tx.productPortionConfiguration.create({
            data: {
              restaurantId,
              productId: product.id,
              optionGroupId: optionGroup.id,
              enabled: true,
              minPortions: portionConfiguration.minPortions,
              maxPortions: portionConfiguration.maxPortions,
              pricingStrategy: portionConfiguration.pricingStrategy,
              allowPortionObservations: portionConfiguration.allowPortionObservations,
            },
          });
        }

        const changedConfigurationFields = [
          saleMode !== undefined ? 'saleMode' : null,
          productData.price !== undefined ? 'basePrice' : null,
          optionGroups !== undefined ? 'optionGroups' : null,
          compositionItems !== undefined ? 'compositionItems' : null,
          portionConfiguration !== undefined ? 'portionConfiguration' : null,
        ].filter((field): field is string => Boolean(field));
        if (actor.userId || actor.userName) {
          await tx.auditLog.create({
            data: {
              restaurantId,
              userId: actor.userId,
              userName: actor.userName,
              userRole: actor.userRole,
              action: 'PRODUCT_CONFIGURATION_UPDATED',
              resource: 'Product',
              metadata: {
                productId: product.id,
                changedFields: changedConfigurationFields,
                previousSaleMode: product.saleMode,
                saleMode: effectiveSaleMode,
                previousBasePrice: Number(product.price),
                basePrice: Number(productData.price ?? product.price),
                previousConfigurationVersion: Number(product.configurationVersion ?? 1),
                configurationVersion: Number(product.configurationVersion ?? 1) + 1,
              },
            },
          });
        }

        return tx.product.findUniqueOrThrow({
          where: { id_restaurantId: { id: product.id, restaurantId } },
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
    } catch (error) {
      if (expectedConfigurationVersion && isOptimisticUpdateConflict(error)) {
        throw new Error(
          'A configuração deste produto foi atualizada por outra pessoa. Recarregue e revise suas alterações.',
        );
      }
      throw error;
    }
  }
}

export default new UpdateProductService();
