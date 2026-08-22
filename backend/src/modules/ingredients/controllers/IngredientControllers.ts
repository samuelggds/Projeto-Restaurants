import type { Request, Response } from 'express';
import {
  createIngredientService,
  deleteIngredientService,
  listIngredientsService,
  updateIngredientService,
} from '../services/IngredientServices.js';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function listIngredients(req: Request, res: Response) {
  try {
    return res.json(await listIngredientsService.execute(Number(req.user?.restaurantId)));
  } catch (error) {
    return res.status(400).json({ error: errorMessage(error, 'Erro ao listar ingredientes.') });
  }
}

export async function createIngredient(req: Request, res: Response) {
  try {
    const ingredient = await createIngredientService.execute(
      req.body,
      Number(req.user?.restaurantId),
    );
    return res.status(201).json(ingredient);
  } catch (error) {
    return res.status(400).json({ error: errorMessage(error, 'Erro ao criar ingrediente.') });
  }
}

export async function updateIngredient(req: Request, res: Response) {
  try {
    const ingredient = await updateIngredientService.execute(
      Number(req.params.id),
      req.body,
      Number(req.user?.restaurantId),
    );
    return res.json(ingredient);
  } catch (error) {
    return res.status(400).json({ error: errorMessage(error, 'Erro ao atualizar ingrediente.') });
  }
}

export async function deleteIngredient(req: Request, res: Response) {
  try {
    return res.json(
      await deleteIngredientService.execute(
        Number(req.params.id),
        Number(req.user?.restaurantId),
      ),
    );
  } catch (error) {
    return res.status(400).json({ error: errorMessage(error, 'Erro ao excluir ingrediente.') });
  }
}
