import type { Request, Response } from 'express';
import OpenAI from 'openai';
import enhanceRestaurantImageService, {
  type RestaurantImagePurpose,
} from '../services/EnhanceRestaurantImageService.js';
import {
  ImageEnhancementConfigurationError,
  ImageEnhancementInputError,
  ImageEnhancementResultError,
} from '../errors/ImageEnhancementErrors.js';

type ImageEnhancementHttpError = {
  status: number;
  body: { error: string; code: string };
};

export function toImageEnhancementHttpError(error: unknown): ImageEnhancementHttpError {
  if (error instanceof ImageEnhancementInputError) {
    return {
      status: 400,
      body: { error: error.message, code: 'IMAGE_AI_INVALID_INPUT' },
    };
  }

  if (error instanceof ImageEnhancementConfigurationError) {
    return {
      status: 503,
      body: {
        error: 'O serviço de melhoria de imagens ainda não está configurado.',
        code: 'IMAGE_AI_NOT_CONFIGURED',
      },
    };
  }

  if (
    error instanceof OpenAI.AuthenticationError ||
    error instanceof OpenAI.PermissionDeniedError
  ) {
    return {
      status: 503,
      body: {
        error: 'O serviço de melhoria de imagens está temporariamente indisponível.',
        code: 'IMAGE_AI_AUTH_ERROR',
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
            code: 'IMAGE_AI_QUOTA_EXCEEDED',
          }
        : {
            error: 'O serviço de IA recebeu muitas solicitações. Tente novamente em instantes.',
            code: 'IMAGE_AI_RATE_LIMITED',
          },
    };
  }

  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return {
      status: 504,
      body: {
        error: 'O serviço de IA demorou demais para responder. Tente novamente.',
        code: 'IMAGE_AI_TIMEOUT',
      },
    };
  }

  if (error instanceof OpenAI.BadRequestError || error instanceof OpenAI.UnprocessableEntityError) {
    return {
      status: 422,
      body: {
        error: 'A imagem não pôde ser processada pela IA. Tente usar outra imagem.',
        code: 'IMAGE_AI_REJECTED',
      },
    };
  }

  if (
    error instanceof ImageEnhancementResultError ||
    error instanceof OpenAI.APIConnectionError ||
    error instanceof OpenAI.APIError
  ) {
    return {
      status: 502,
      body: {
        error: 'O serviço de melhoria de imagens não respondeu corretamente.',
        code: 'IMAGE_AI_PROVIDER_ERROR',
      },
    };
  }

  return {
    status: 500,
    body: {
      error: 'Não foi possível melhorar a imagem neste momento.',
      code: 'IMAGE_AI_UNEXPECTED_ERROR',
    },
  };
}

class EnhanceRestaurantImageController {
  async handle(req: Request, res: Response, purpose: RestaurantImagePurpose = 'COVER') {
    try {
      return res.json(await enhanceRestaurantImageService.execute(req.body?.imageDataUrl, purpose));
    } catch (error) {
      const mappedError = toImageEnhancementHttpError(error);
      return res.status(mappedError.status).json(mappedError.body);
    }
  }
}

export default new EnhanceRestaurantImageController();
