import { z } from 'zod';
import {
  createIngredientSchema,
  updateIngredientSchema,
} from '../../../validators/IngredientValidator.js';
import ingredientRepository from '../repositories/IngredientRepository.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { createPublicMediaReference } from '../../publicMedia/utils/publicMediaReference.js';
import ingredientImageSearchService from './IngredientImageSearchService.js';

type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;

function assertRestaurantId(restaurantId: number | null | undefined) {
  if (!Number.isInteger(Number(restaurantId)) || Number(restaurantId) <= 0) {
    throw new Error('Restaurante não encontrado.');
  }
  return Number(restaurantId);
}

function presentIngredient<T extends { id: number; image?: string | null; updatedAt?: Date }>(
  ingredient: T,
  restaurantId: number,
) {
  return {
    ...ingredient,
    image: createPublicMediaReference(
      ingredient.image,
      `/public-media/restaurants/${restaurantId}/ingredients/${ingredient.id}`,
      ingredient.updatedAt,
    ),
  };
}

export class ListIngredientsService {
  async execute(restaurantId: number) {
    const tenantId = assertRestaurantId(restaurantId);
    const ingredients = await ingredientRepository.findAll(tenantId);
    const categories = [...new Set(ingredients.map((ingredient) => ingredient.category))].sort(
      (left, right) => left.localeCompare(right, 'pt-BR'),
    );
    return {
      ingredients: ingredients.map((ingredient) => presentIngredient(ingredient, tenantId)),
      count: ingredients.length,
      categories,
    };
  }
}

export class CreateIngredientService {
  async execute(input: CreateIngredientInput, restaurantId: number) {
    const tenantId = assertRestaurantId(restaurantId);
    const data = createIngredientSchema.parse(input);
    if (data.image !== undefined && data.imageSelectionToken) {
      throw new Error('Escolha a foto sugerida ou envie sua própria foto, não as duas.');
    }
    const duplicate = await ingredientRepository.findByName(data.name, tenantId);

    if (duplicate) {
      throw new Error('Já existe um ingrediente com este nome neste restaurante.');
    }

    const image = data.imageSelectionToken
      ? await ingredientImageSearchService.importSelection(data.imageSelectionToken, tenantId)
      : (data.image ?? null);
    const ingredient = await ingredientRepository.create(
      {
        name: data.name,
        category: data.category,
        price: data.price,
        active: data.active ?? true,
        image,
      },
      tenantId,
    );
    return presentIngredient(ingredient, tenantId);
  }
}

export class UpdateIngredientService {
  async execute(id: number, input: UpdateIngredientInput, restaurantId: number) {
    const tenantId = assertRestaurantId(restaurantId);
    const ingredientId = Number(id);
    const data = updateIngredientSchema.parse(input);
    if (data.image !== undefined && data.imageSelectionToken) {
      throw new Error('Escolha a foto sugerida ou envie sua própria foto, não as duas.');
    }
    const existing = await ingredientRepository.findById(ingredientId, tenantId);

    if (!existing) {
      throw new Error('Ingrediente não encontrado neste restaurante.');
    }

    if (data.name) {
      const duplicate = await ingredientRepository.findByName(data.name, tenantId);
      if (duplicate && duplicate.id !== ingredientId) {
        throw new Error('Já existe um ingrediente com este nome neste restaurante.');
      }
    }

    const { imageSelectionToken, ...updateData } = data;
    if (imageSelectionToken) {
      updateData.image = await ingredientImageSearchService.importSelection(
        imageSelectionToken,
        tenantId,
      );
    }
    const ingredient = await ingredientRepository.update(ingredientId, updateData, tenantId);
    return ingredient ? presentIngredient(ingredient, tenantId) : ingredient;
  }
}

export class DeleteIngredientService {
  async execute(id: number, restaurantId: number) {
    const tenantId = assertRestaurantId(restaurantId);
    const ingredientId = Number(id);
    const existing = await ingredientRepository.findById(ingredientId, tenantId);

    if (!existing) {
      throw new Error('Ingrediente não encontrado neste restaurante.');
    }

    await withTenantDbContext(tenantId, (db) =>
      ingredientRepository.delete(ingredientId, tenantId, db),
    );
    return { message: 'Ingrediente excluído com sucesso.' };
  }
}

export const listIngredientsService = new ListIngredientsService();
export const createIngredientService = new CreateIngredientService();
export const updateIngredientService = new UpdateIngredientService();
export const deleteIngredientService = new DeleteIngredientService();
