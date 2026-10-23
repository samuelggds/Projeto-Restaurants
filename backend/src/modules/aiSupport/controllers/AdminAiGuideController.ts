import type { Request, Response } from 'express';
import OpenAI from 'openai';
import { ZodError } from 'zod';
import { safeErrorName } from '../../../services/telemetrySanitizer.js';
import adminAiGuideService from '../services/AdminAiGuideService.js';
import adminRestaurantAssistantService from '../services/AdminRestaurantAssistantService.js';
import adminAiActionService from '../services/AdminAiActionService.js';
import adminAiSettingsService from '../services/AdminAiSettingsService.js';
import aiImageBatchJobService from '../services/AiImageBatchJobService.js';
import aiCreditService, { AiCreditsExhaustedError, PremiumAiPlanRequiredError } from '../services/AiCreditService.js';
import aiCreditTopUpService from '../services/AiCreditTopUpService.js';
import { AdminAiRestrictedRequestError } from '../domain/adminAiSecurityPolicy.js';
import { adminAiCapabilitiesForArea, normalizeAdminAiArea } from '../domain/adminAiCapabilities.js';

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

const SAFE_USER_MESSAGES = new Set([
  'Escreva o que você deseja resolver no restaurante.',
  'A pergunta deve ter no máximo 1200 caracteres.',
  'Pedido inválido.',
  'Pedido não encontrado neste restaurante.',
  'Este pedido não possui uma conversa de atendimento.',
]);

function mapError(error: unknown) {
  if (error instanceof AdminAiRestrictedRequestError) {
    return { status: 403, body: { error: error.message, code: error.code } };
  }
  if (error instanceof PremiumAiPlanRequiredError) {
    return { status: 403, body: { error: error.message, code: error.code } };
  }
  if (error instanceof AiCreditsExhaustedError) {
    return { status: 402, body: { error: error.message, code: error.code } };
  }
  if (error instanceof OpenAI.RateLimitError) {
    return {
      status: 429,
      body: {
        error: 'Estou recebendo muitas solicitações agora. Tente novamente em alguns instantes.',
        code: 'OPENAI_RATE_LIMITED',
      },
    };
  }
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return {
      status: 504,
      body: {
        error: 'A confirmação demorou mais que o esperado. O saldo está reservado enquanto verificamos a solicitação. Se persistir, contate o suporte.',
        code: 'OPENAI_TIMEOUT',
      },
    };
  }
  if (error instanceof OpenAI.AuthenticationError || error instanceof OpenAI.PermissionDeniedError) {
    return {
      status: 503,
      body: {
        error: 'O Assistente IA está temporariamente indisponível. Tente novamente mais tarde.',
        code: 'OPENAI_AUTH_ERROR',
      },
    };
  }
  if (error instanceof ZodError) {
    console.warn('[ADMIN_AI_RESPONSE_VALIDATION_ERROR]', {
      issueCount: error.issues.length,
      issues: error.issues.map((issue) => ({ code: issue.code, path: issue.path })),
    });
    return {
      status: 502,
      body: {
        error: 'Não consegui organizar a resposta desta vez. Tente perguntar novamente.',
        code: 'AI_RESPONSE_INVALID',
      },
    };
  }

  const message = error instanceof Error ? error.message : '';
  if (SAFE_USER_MESSAGES.has(message)) {
    return { status: 400, body: { error: message, code: 'AI_GUIDE_ERROR' } };
  }

  console.error('[ADMIN_AI_INTERNAL_ERROR]', {
    name: safeErrorName(error),
  });
  return {
    status: 500,
    body: {
      error: 'Não consegui concluir essa resposta agora. Tente novamente em alguns instantes.',
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
      actorFromRequest(req);
      return aiCreditTopUpService.quote(req.query.amountUsd);
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

  async topUps(req: Request, res: Response) {
    return respond(res, () => aiCreditTopUpService.list(actorFromRequest(req)));
  }

  async guide(req: Request, res: Response) {
    return respond(res, () => adminAiGuideService.execute(req.body?.question, actorFromRequest(req)));
  }

  async capabilities(req: Request, res: Response) {
    try {
      actorFromRequest(req);
      const area = normalizeAdminAiArea(req.query.area);
      return res.json({
        area,
        capabilities: adminAiCapabilitiesForArea(area),
      });
    } catch (error) {
      const mapped = mapError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async managementSummary(req: Request, res: Response) {
    return respond(res, () => adminRestaurantAssistantService.summary(actorFromRequest(req)));
  }

  async assistant(req: Request, res: Response) {
    return respond(res, async () => {
      const actor = actorFromRequest(req);
      await adminAiSettingsService.assertRequestBudget(actor);
      return adminRestaurantAssistantService.ask(req.body?.question, actor, req.body?.area);
    });
  }

  async supportDraft(req: Request, res: Response) {
    return respond(res, async () => {
      const actor = actorFromRequest(req);
      await adminAiSettingsService.assertRequestBudget(actor);
      return adminRestaurantAssistantService.supportDraft(req.params.orderId, actor);
    });
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

  async assistantSettings(req: Request, res: Response) {
    return respond(res, () => adminAiSettingsService.get(actorFromRequest(req)));
  }

  async updateAssistantSettings(req: Request, res: Response) {
    return respond(res, () => adminAiSettingsService.update(req.body, actorFromRequest(req)));
  }

  async estimateImageBatch(req: Request, res: Response) {
    try {
      actorFromRequest(req);
      return res.json(aiImageBatchJobService.estimate(req.body));
    } catch (error) {
      const mapped = mapError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  async createImageBatch(req: Request, res: Response) {
    return respond(
      res,
      () => aiImageBatchJobService.enqueue(req.body, actorFromRequest(req)),
      201,
    );
  }

  async imageBatches(req: Request, res: Response) {
    return respond(res, () => aiImageBatchJobService.list(actorFromRequest(req)));
  }

  async cancelImageBatchItem(req: Request, res: Response) {
    return respond(res, () =>
      aiImageBatchJobService.cancelItem(
        req.params.jobPublicId,
        req.params.itemPublicId,
        actorFromRequest(req),
      ),
    );
  }

  async retryImageBatchFailures(req: Request, res: Response) {
    return respond(res, () =>
      aiImageBatchJobService.retryFailures(req.params.jobPublicId, actorFromRequest(req)),
    );
  }
}

export default new AdminAiGuideController();
