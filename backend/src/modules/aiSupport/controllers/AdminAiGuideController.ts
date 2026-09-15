import type { Request, Response } from 'express';
import OpenAI from 'openai';
import adminAiGuideService from '../services/AdminAiGuideService.js';
import adminRestaurantAssistantService from '../services/AdminRestaurantAssistantService.js';
import adminAiActionService from '../services/AdminAiActionService.js';
import aiCreditService, { AiCreditsExhaustedError } from '../services/AiCreditService.js';
import aiCreditTopUpService from '../services/AiCreditTopUpService.js';
import { AdminAiRestrictedRequestError } from '../domain/adminAiSecurityPolicy.js';

export function actorFromRequest(req: Request) {
  const userId = Number(req.user?.id || 0);
  const restaurantId = Number(req.user?.restaurantId || 0);
  const email = String(req.user?.email || '').trim();
  if (!userId || !restaurantId || String(req.user?.role || '').toUpperCase() !== 'ADMIN') {
    throw new Error('Conta ADMIN inválida para usar recursos de IA.');
  }
  return {
    userId,
    restaurantId,
    email,
    userName: email,
    userRole: req.user?.role,
  };
}

function mapError(error: unknown) {
  if (error instanceof AdminAiRestrictedRequestError) {
    return { status: 403, body: { error: error.message, code: error.code } };
  }
  if (error instanceof AiCreditsExhaustedError) {
    return { status: 402, body: { error: error.message, code: error.code } };
  }
  if (error instanceof OpenAI.RateLimitError) {
    return {
      status: 429,
      body: {
        error: 'A OpenAI recebeu muitas solicitações. Tente novamente em instantes.',
        code: 'OPENAI_RATE_LIMITED',
      },
    };
  }
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return {
      status: 504,
      body: {
        error: 'A IA demorou mais que o limite permitido. O restaurante continua funcionando normalmente.',
        code: 'OPENAI_TIMEOUT',
      },
    };
  }
  if (error instanceof OpenAI.AuthenticationError || error instanceof OpenAI.PermissionDeniedError) {
    return {
      status: 503,
      body: {
        error: 'O serviço OpenAI está temporariamente indisponível.',
        code: 'OPENAI_AUTH_ERROR',
      },
    };
  }
  return {
    status: 400,
    body: {
      error: error instanceof Error ? error.message : 'Não foi possível concluir a operação de IA.',
      code: 'AI_GUIDE_ERROR',
    },
  };
}

async function respond(res: Response, operation: () => Promise<unknown>, status = 200) {
  try {
    return res.status(status).json(await operation());
  } catch (error) {
    const mapped = mapError(error);
    return res.status(mapped.status).json(mapped.body);
  }
}

class AdminAiGuideController {
  async balance(req: Request, res: Response) {
    return respond(res, () => aiCreditService.getBalance(actorFromRequest(req)));
  }

  async quote(req: Request, res: Response) {
    return respond(res, () => {
      const actor = actorFromRequest(req);
      return aiCreditTopUpService.quote(req.query.amountUsd, actor.restaurantId);
    });
  }

  async pixTopUp(req: Request, res: Response) {
    return respond(
      res,
      () => {
        const actor = actorFromRequest(req);
        return aiCreditTopUpService.createPix(actor, req.body?.amountUsd);
      },
      201,
    );
  }

  async cardTopUp(req: Request, res: Response) {
    return respond(
      res,
      () => {
        const actor = actorFromRequest(req);
        return aiCreditTopUpService.createCard(actor, req.body?.amountUsd);
      },
      201,
    );
  }

  async topUps(req: Request, res: Response) {
    return respond(res, () => aiCreditTopUpService.list(actorFromRequest(req)));
  }

  async guide(req: Request, res: Response) {
    return respond(res, () => adminAiGuideService.execute(req.body?.question, actorFromRequest(req)));
  }

  async managementSummary(req: Request, res: Response) {
    return respond(res, () => adminRestaurantAssistantService.summary(actorFromRequest(req)));
  }

  async assistant(req: Request, res: Response) {
    return respond(res, () =>
      adminRestaurantAssistantService.ask(req.body?.question, actorFromRequest(req)),
    );
  }

  async supportDraft(req: Request, res: Response) {
    return respond(res, () =>
      adminRestaurantAssistantService.supportDraft(req.params.orderId, actorFromRequest(req)),
    );
  }

  async actions(req: Request, res: Response) {
    return respond(res, () => adminAiActionService.list(actorFromRequest(req)));
  }

  async approveAction(req: Request, res: Response) {
    return respond(res, () =>
      adminAiActionService.approveAndExecute(req.params.publicId, actorFromRequest(req)),
    );
  }

  async cancelAction(req: Request, res: Response) {
    return respond(res, () =>
      adminAiActionService.cancel(req.params.publicId, actorFromRequest(req)),
    );
  }
}

export default new AdminAiGuideController();
