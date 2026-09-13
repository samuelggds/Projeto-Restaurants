import type { Request, Response } from 'express';
import OpenAI from 'openai';
import generateImportedProductImageService from '../services/GenerateImportedProductImageService.js';

function toHttpError(error: unknown) {
  if (error instanceof OpenAI.AuthenticationError || error instanceof OpenAI.PermissionDeniedError) {
    return {
      status: 503,
      body: {
        error: 'A geração de imagens por IA está temporariamente indisponível.',
        code: 'PRODUCT_IMAGE_AI_AUTH_ERROR',
      },
    };
  }

  if (error instanceof OpenAI.RateLimitError) {
    const providerSignals = `${error.code || ''} ${error.type || ''}`.toLowerCase();
    const quotaExceeded = providerSignals.includes('insufficient_quota');
    return {
      status: 429,
      body: quotaExceeded
        ? {
            error: 'A cota do serviço de IA foi atingida. Tente novamente mais tarde.',
            code: 'PRODUCT_IMAGE_AI_QUOTA_EXCEEDED',
          }
        : {
            error: 'O serviço de IA recebeu muitas solicitações. Tente novamente em instantes.',
            code: 'PRODUCT_IMAGE_AI_RATE_LIMITED',
          },
    };
  }

  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return {
      status: 504,
      body: {
        error: 'A geração da imagem demorou demais. Tente novamente.',
        code: 'PRODUCT_IMAGE_AI_TIMEOUT',
      },
    };
  }

  if (error instanceof OpenAI.APIConnectionError || error instanceof OpenAI.APIError) {
    return {
      status: 502,
      body: {
        error: 'O serviço de geração de imagens não respondeu corretamente.',
        code: 'PRODUCT_IMAGE_AI_PROVIDER_ERROR',
      },
    };
  }

  return {
    status: 400,
    body: {
      error: error instanceof Error ? error.message : 'Não foi possível gerar a imagem do produto.',
      code: 'PRODUCT_IMAGE_AI_ERROR',
    },
  };
}

class GenerateImportedProductImageController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = Number(req.user?.restaurantId || 0);
      const result = await generateImportedProductImageService.execute(req.params.productId, restaurantId);
      return res.json(result);
    } catch (error) {
      const mapped = toHttpError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }
}

export default new GenerateImportedProductImageController();
