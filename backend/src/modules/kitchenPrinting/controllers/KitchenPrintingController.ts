import type { Request, Response } from 'express';
import { z, ZodError } from 'zod';

import {
  issuePrinterAgentCredentialSchema,
  printerAgentFailureSchema,
  printerAgentHeartbeatSchema,
  updatePrinterSettingsSchema,
} from '../domain/kitchenPrintingSchemas.js';
import kitchenPrintingAdminService from '../services/KitchenPrintingAdminService.js';
import printerAgentJobService from '../services/PrinterAgentJobService.js';

const uuidSchema = z.string().uuid();
const orderIdSchema = z.coerce.number().int().positive();

function userId(req: Request) {
  const id = Number(req.user?.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Usuário não identificado.');
  return id;
}

function agent(req: Request) {
  if (!req.printerAgent) throw new Error('Agente não autenticado.');
  return req.printerAgent;
}

function sendError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: error.issues[0]?.message || 'Dados inválidos.' });
  }
  const message = error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
  const expected =
    /^(Restaurante|Usuário|Agente|Ative|Pedido|Job|Credencial|Acesso|Impressão|Informe|Use)/iu.test(
      message,
    ) || /não (?:encontrad|pertence|autorizad|identificad)/iu.test(message);
  if (!expected) {
    console.error('[KITCHEN_PRINTING_REQUEST_ERROR]', {
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return res.status(500).json({ error: 'Não foi possível concluir a operação de impressão.' });
  }
  const notFound = /não encontrad|não pertence/iu.test(message);
  return res.status(notFound ? 404 : 400).json({ error: message });
}

class KitchenPrintingController {
  async getSettings(req: Request, res: Response) {
    try {
      return res.json(await kitchenPrintingAdminService.getConfiguration(req.user?.restaurantId));
    } catch (error) {
      return sendError(res, error);
    }
  }

  async updateSettings(req: Request, res: Response) {
    try {
      const input = updatePrinterSettingsSchema.parse(req.body);
      return res.json(
        await kitchenPrintingAdminService.updateSettings(req.user?.restaurantId, input),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async issueCredential(req: Request, res: Response) {
    try {
      const input = issuePrinterAgentCredentialSchema.parse(req.body || {});
      res.setHeader('Cache-Control', 'no-store');
      return res.status(201).json(
        await kitchenPrintingAdminService.issueCredential({
          restaurantId: req.user?.restaurantId,
          ...input,
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async revokeCredential(req: Request, res: Response) {
    try {
      const devicePublicId = uuidSchema.parse(req.params.devicePublicId);
      return res.json(
        await kitchenPrintingAdminService.revokeCredential(req.user?.restaurantId, devicePublicId),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async testPrint(req: Request, res: Response) {
    try {
      const job = await kitchenPrintingAdminService.printTest(req.user?.restaurantId, userId(req));
      return res.status(202).json({ jobPublicId: job.publicId, status: job.status });
    } catch (error) {
      return sendError(res, error);
    }
  }

  async reprintOrder(req: Request, res: Response) {
    try {
      const job = await kitchenPrintingAdminService.reprintOrder({
        restaurantId: req.user?.restaurantId,
        orderId: orderIdSchema.parse(req.params.orderId),
        requestedByUserId: userId(req),
      });
      return res.status(202).json({ jobPublicId: job.publicId, status: job.status });
    } catch (error) {
      return sendError(res, error);
    }
  }

  async listJobs(req: Request, res: Response) {
    try {
      const limit = z.coerce.number().int().min(1).max(50).default(20).parse(req.query.limit);
      return res.json(await kitchenPrintingAdminService.listJobs(req.user?.restaurantId, limit));
    } catch (error) {
      return sendError(res, error);
    }
  }

  async retryJob(req: Request, res: Response) {
    try {
      const jobPublicId = uuidSchema.parse(req.params.jobPublicId);
      return res.json(
        await kitchenPrintingAdminService.retryJob(req.user?.restaurantId, jobPublicId),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async agentHeartbeat(req: Request, res: Response) {
    try {
      const input = printerAgentHeartbeatSchema.parse(req.body || {});
      return res.json(await printerAgentJobService.heartbeat(agent(req), input));
    } catch (error) {
      return sendError(res, error);
    }
  }

  async agentClaim(req: Request, res: Response) {
    try {
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ job: await printerAgentJobService.claimNext(agent(req)) });
    } catch (error) {
      return sendError(res, error);
    }
  }

  async agentPrinted(req: Request, res: Response) {
    try {
      const jobPublicId = uuidSchema.parse(req.params.jobPublicId);
      return res.json(await printerAgentJobService.markPrinted(agent(req), jobPublicId));
    } catch (error) {
      return sendError(res, error);
    }
  }

  async agentFailed(req: Request, res: Response) {
    try {
      const jobPublicId = uuidSchema.parse(req.params.jobPublicId);
      const input = printerAgentFailureSchema.parse(req.body);
      return res.json(
        await printerAgentJobService.markFailed(agent(req), jobPublicId, input.error),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }
}

export default new KitchenPrintingController();
