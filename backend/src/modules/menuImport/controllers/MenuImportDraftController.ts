import type { Request, Response } from 'express';
import OpenAI from 'openai';
import menuImportDraftService from '../services/MenuImportDraftService.js';
import { AiCreditsExhaustedError } from '../../aiSupport/services/AiCreditService.js';

function actor(req: Request) {
  return {
    userId: Number(req.user?.id || 0),
    restaurantId: Number(req.user?.restaurantId || 0),
    userName: req.user?.email,
    userRole: req.user?.role,
  };
}

function errorResponse(error: unknown) {
  if (error instanceof AiCreditsExhaustedError) {
    return { status: 402, body: { error: error.message, code: error.code } };
  }
  if (error instanceof OpenAI.RateLimitError) {
    return { status: 429, body: { error: 'A IA recebeu muitas solicitações. Tente novamente em instantes.' } };
  }
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return { status: 504, body: { error: 'A leitura da imagem excedeu o tempo limite. Nenhum produto foi publicado.' } };
  }
  return {
    status: 400,
    body: { error: error instanceof Error ? error.message : 'Não foi possível revisar a importação.' },
  };
}

class MenuImportDraftController {
  async previewImage(req: Request, res: Response) {
    try {
      return res.status(201).json(await menuImportDraftService.createFromImage(req.body?.imageUrl, actor(req)));
    } catch (error) {
      const mapped = errorResponse(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async get(req: Request, res: Response) {
    try {
      return res.json(await menuImportDraftService.get(req.params.publicId, actor(req)));
    } catch (error) {
      const mapped = errorResponse(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async updateItem(req: Request, res: Response) {
    try {
      return res.json(
        await menuImportDraftService.updateItem(
          req.params.publicId,
          req.params.itemPublicId,
          req.body,
          actor(req),
        ),
      );
    } catch (error) {
      const mapped = errorResponse(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async publish(req: Request, res: Response) {
    try {
      return res.json(await menuImportDraftService.publish(req.params.publicId, actor(req)));
    } catch (error) {
      const mapped = errorResponse(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }
}

export default new MenuImportDraftController();
