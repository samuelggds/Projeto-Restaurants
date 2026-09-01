import type { Request, Response } from 'express';
import { ZodError } from 'zod';

import {
  compensationPolicySchema,
  createSettlementSchema,
  disputeSettlementSchema,
  positiveIdSchema,
  settlementStatusSchema,
  updateDefaultCompensationSchema,
  uuidSchema,
} from '../domain/courierCompensationSchemas.js';
import courierCompensationService from '../services/CourierCompensationService.js';
import courierSettlementService from '../services/CourierSettlementService.js';
import type { CompensationPolicyInput } from '../domain/courierCompensation.js';

function actor(req: Request) {
  const userId = Number(req.user?.id);
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error('Usuário não identificado.');
  return { userId, role: String(req.user?.role || '') };
}

function tenant(req: Request) {
  return req.user?.restaurantId;
}

function sendError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: error.issues[0]?.message || 'Dados inválidos.' });
  }
  const message = error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
  const notFound = /não encontrad/iu.test(message);
  const conflict = /outra sessão|outro acerto|acabou de ser incluída/iu.test(message);
  return res.status(notFound ? 404 : conflict ? 409 : 400).json({ error: message });
}

class CourierCompensationController {
  async getConfiguration(req: Request, res: Response) {
    try {
      return res.json(await courierCompensationService.getAdminConfiguration(tenant(req)));
    } catch (error) {
      return sendError(res, error);
    }
  }

  async updateDefault(req: Request, res: Response) {
    try {
      const input = updateDefaultCompensationSchema.parse(req.body);
      return res.json(
        await courierCompensationService.updateDefault({
          restaurantId: tenant(req),
          actor: actor(req),
          timezone: input.timezone,
          policy: input as CompensationPolicyInput,
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async updateCourierOverride(req: Request, res: Response) {
    try {
      return res.json(
        await courierCompensationService.updateCourierOverride({
          restaurantId: tenant(req),
          courierId: positiveIdSchema.parse(req.params.courierId),
          actor: actor(req),
          policy: compensationPolicySchema.parse(req.body) as CompensationPolicyInput,
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async removeCourierOverride(req: Request, res: Response) {
    try {
      return res.json(
        await courierCompensationService.removeCourierOverride({
          restaurantId: tenant(req),
          courierId: positiveIdSchema.parse(req.params.courierId),
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async pendingOrders(req: Request, res: Response) {
    try {
      return res.json(
        await courierSettlementService.listPendingOrders({
          restaurantId: tenant(req),
          courierId: req.query.courierId ? positiveIdSchema.parse(req.query.courierId) : undefined,
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async createSettlement(req: Request, res: Response) {
    try {
      const input = createSettlementSchema.parse(req.body);
      return res.status(201).json(
        await courierSettlementService.create({
          restaurantId: tenant(req),
          courierId: input.courierId!,
          orderIds: input.orderIds!,
          paymentMethod: input.paymentMethod,
          adminNote: input.adminNote,
          evidenceUrl: input.evidenceUrl,
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async listAdminSettlements(req: Request, res: Response) {
    try {
      return res.json(
        await courierSettlementService.listAdmin({
          restaurantId: tenant(req),
          courierId: req.query.courierId ? positiveIdSchema.parse(req.query.courierId) : undefined,
          status: req.query.status ? settlementStatusSchema.parse(req.query.status) : undefined,
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async cancelSettlement(req: Request, res: Response) {
    try {
      return res.json(
        await courierSettlementService.cancel({
          restaurantId: tenant(req),
          publicId: uuidSchema.parse(req.params.publicId),
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async listCourierSettlements(req: Request, res: Response) {
    try {
      return res.json(
        await courierSettlementService.listCourier({
          restaurantId: tenant(req),
          courierId: actor(req).userId,
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async confirmSettlement(req: Request, res: Response) {
    try {
      const currentActor = actor(req);
      return res.json(
        await courierSettlementService.confirm({
          restaurantId: tenant(req),
          courierId: currentActor.userId,
          publicId: uuidSchema.parse(req.params.publicId),
          actor: currentActor,
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async disputeSettlement(req: Request, res: Response) {
    try {
      const currentActor = actor(req);
      const input = disputeSettlementSchema.parse(req.body);
      return res.json(
        await courierSettlementService.dispute({
          restaurantId: tenant(req),
          courierId: currentActor.userId,
          publicId: uuidSchema.parse(req.params.publicId),
          reason: input.reason,
          actor: currentActor,
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }
}

export default new CourierCompensationController();
