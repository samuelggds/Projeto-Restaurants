import type { Request, Response } from 'express';
import OpenAI from 'openai';
import {
  createIngredientService,
  deleteIngredientService,
  listIngredientsService,
  updateIngredientService,
} from '../services/IngredientServices.js';
import ingredientImageSearchService from '../services/IngredientImageSearchService.js';
import generateIngredientImageService from '../services/GenerateIngredientImageService.js';
import { IngredientImageSearchUnavailableError } from '../images/IngredientImageSearchProvider.js';
import aiCreditService, { AiCreditsExhaustedError } from '../../aiSupport/services/AiCreditService.js';

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

export async function searchIngredientImages(req: Request, res: Response) {
  try {
    return res.json(
      await ingredientImageSearchService.search(req.body, Number(req.user?.restaurantId)),
    );
  } catch (error) {
    const status = error instanceof IngredientImageSearchUnavailableError ? 503 : 400;
    return res.status(status).json({
      error: errorMessage(error, 'Não conseguimos buscar imagens agora.'),
    });
  }
}

export async function generateIngredientImage(req: Request, res: Response) {
  const restaurantId = Number(req.user?.restaurantId || 0);
  const actor = {
    userId: Number(req.user?.id || 0),
    restaurantId,
    userName: req.user?.email,
    userRole: req.user?.role,
  };

  try {
    await aiCreditService.assertAvailable(actor);
    const result = await generateIngredientImageService.execute(req.body || {});
    const credits = await aiCreditService.recordUsage({
      ...actor,
      feature: 'GENERATE_INGREDIENT_IMAGE',
      model: result.aiUsage.model,
      costUsd: result.aiUsage.costUsd,
      usage: result.aiUsage.usage,
    });
    return res.json({ image: result.image, credits });
  } catch (error) {
    if (error instanceof AiCreditsExhaustedError) {
      return res.status(402).json({ error: error.message, code: error.code });
    }
    if (error instanceof OpenAI.AuthenticationError || error instanceof OpenAI.PermissionDeniedError) {
      return res.status(503).json({
        error: 'A geração de imagens por IA está temporariamente indisponível.',
        code: 'INGREDIENT_IMAGE_AI_AUTH_ERROR',
      });
    }
    if (error instanceof OpenAI.RateLimitError) {
      return res.status(429).json({
        error: 'O serviço de IA está temporariamente ocupado ou sem cota. Tente novamente mais tarde.',
        code: 'INGREDIENT_IMAGE_AI_RATE_LIMITED',
      });
    }
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return res.status(504).json({
        error: 'A geração da imagem demorou demais. Tente novamente.',
        code: 'INGREDIENT_IMAGE_AI_TIMEOUT',
      });
    }
    if (error instanceof OpenAI.APIConnectionError || error instanceof OpenAI.APIError) {
      return res.status(502).json({
        error: 'O serviço de geração de imagens não respondeu corretamente.',
        code: 'INGREDIENT_IMAGE_AI_PROVIDER_ERROR',
      });
    }
    return res.status(400).json({
      error: errorMessage(error, 'Não foi possível gerar a imagem do ingrediente.'),
      code: 'INGREDIENT_IMAGE_AI_ERROR',
    });
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
      await deleteIngredientService.execute(Number(req.params.id), Number(req.user?.restaurantId)),
    );
  } catch (error) {
    return res.status(400).json({ error: errorMessage(error, 'Erro ao excluir ingrediente.') });
  }
}
