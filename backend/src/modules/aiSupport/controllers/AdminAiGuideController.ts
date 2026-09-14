import type { Request, Response } from 'express';
import OpenAI from 'openai';
import adminAiGuideService from '../services/AdminAiGuideService.js';
import aiCreditService, { AiCreditsExhaustedError } from '../services/AiCreditService.js';

function actorFromRequest(req: Request) {
  const userId = Number(req.user?.id || 0);
  const restaurantId = Number(req.user?.restaurantId || 0);
  if (!userId || !restaurantId || String(req.user?.role || '').toUpperCase() !== 'ADMIN') {
    throw new Error('Conta ADMIN inválida para usar recursos de IA.');
  }
  return {
    userId,
    restaurantId,
    userName: req.user?.email,
    userRole: req.user?.role,
  };
}

function mapError(error: unknown) {
  if (error instanceof AiCreditsExhaustedError) {
    return { status: 402, body: { error: error.message, code: error.code } };
  }
  if (error instanceof OpenAI.RateLimitError) {
    return {
      status: 429,
      body: { error: 'A OpenAI recebeu muitas solicitações. Tente novamente em instantes.', code: 'OPENAI_RATE_LIMITED' },
    };
  }
  if (error instanceof OpenAI.AuthenticationError || error instanceof OpenAI.PermissionDeniedError) {
    return {
      status: 503,
      body: { error: 'O serviço OpenAI está temporariamente indisponível.', code: 'OPENAI_AUTH_ERROR' },
    };
  }
  return {
    status: 400,
    body: {
      error: error instanceof Error ? error.message : 'Não foi possível gerar o guia com IA.',
      code: 'AI_GUIDE_ERROR',
    },
  };
}

class AdminAiGuideController {
  async balance(req: Request, res: Response) {
    try {
      return res.json(await aiCreditService.getBalance(actorFromRequest(req)));
    } catch (error) {
      const mapped = mapError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async guide(req: Request, res: Response) {
    try {
      return res.json(await adminAiGuideService.execute(req.body?.question, actorFromRequest(req)));
    } catch (error) {
      const mapped = mapError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }
}

export default new AdminAiGuideController();
