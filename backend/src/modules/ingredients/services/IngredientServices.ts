import { z } from 'zod';
import {
  createIngredientSchema,
  updateIngredientSchema,
} from '../../../validators/IngredientValidator.js';
import ingredientRepository from '../repositories/IngredientRepository.js';

type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;

function assertRestaurantId(restaurantId: number | null | undefined) {
  if (!Number.isInteger(Number(restaurantId)) || Number(restaurantId) <= 0) {
    throw new Error('Restaurante não encontrado.');
  }
  return Number(restaurantId);
}

export class ListIngredientsService {
  async execute(restaurantId: number) {
    const tenantId = assertRestaurantId(restaurantId);
    const ingredients = await ingredientRepository.findAll(tenantId);
    const categories = [...new Set(ingredients.map((ingredient) => ingredient.category))].sort(
      (left, right) => left.localeCompare(right, 'pt-BR'),
    );
    return { ingredients, count: ingredients.length, categories };
  }
}

export class CreateIngredientService {
  async execute(input: CreateIngredientInput, restaurantId: number) {
    const tenantId = assertRestaurantId(restaurantId);
    const data = createIngredientSchema.parse(input);
    const duplicate = await ingredientRepository.findByName(data.name, tenantId);

    if (duplicate) {
      throw new Error('Já existe um ingrediente com este nome neste restaurante.');
    }

    return ingredientRepository.create(
      {
        name: data.name,
        category: data.category,
        price: data.price,
        active: data.active ?? true,
      },
      tenantId,
    );
  }
}

export class UpdateIngredientService {
  async execute(id: number, input: UpdateIngredientInput, restaurantId: number) {
    const tenantId = assertRestaurantId(restaurantId);
    const ingredientId = Number(id);
    const data = updateIngredientSchema.parse(input);
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

    return ingredientRepository.update(ingredientId, data, tenantId);
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

    await ingredientRepository.delete(ingredientId, tenantId);
    return { message: 'Ingrediente excluído com sucesso.' };
  }
}

export const listIngredientsService = new ListIngredientsService();
export const createIngredientService = new CreateIngredientService();
export const updateIngredientService = new UpdateIngredientService();
export const deleteIngredientService = new DeleteIngredientService();
