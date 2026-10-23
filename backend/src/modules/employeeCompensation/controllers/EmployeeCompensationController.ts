import type { Request, Response } from 'express';
import { ZodError } from 'zod';

import {
  adjustmentSchema,
  assignWaiterSchema,
  closePolicySchema,
  createWorkEntrySchema,
  generateSettlementSchema,
  listEarningQuerySchema,
  listPolicyQuerySchema,
  listSettlementQuerySchema,
  listWorkEntryQuerySchema,
  policySchema,
  positiveIdSchema,
  reasonSchema,
  registerPaymentSchema,
  uuidSchema,
} from '../domain/employeeCompensationSchemas.js';
import employeeLedgerService from '../services/EmployeeLedgerService.js';
import employeePolicyService, {
  type CompensationPolicyInput,
} from '../services/EmployeePolicyService.js';
import employeeSettlementService from '../services/EmployeeSettlementService.js';
import employeeWorkEntryService from '../services/EmployeeWorkEntryService.js';
import tableWaiterAssignmentService from '../services/TableWaiterAssignmentService.js';

function actor(req: Request) {
  const userId = Number(req.user?.id);
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error('Usuário não identificado.');
  return { userId, role: String(req.user?.role || '') };
}

function tenant(req: Request) {
  return req.user?.restaurantId;
}

function idempotencyKey(req: Request) {
  return String(req.get('Idempotency-Key') || '');
}

function sendError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: error.issues[0]?.message || 'Dados inválidos.' });
  }
  const message = error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
  const status = /não encontrad/iu.test(message)
    ? 404
    : /Somente ADMIN|exclusiva do próprio|Acesso/iu.test(message)
      ? 403
      : /outra sessão|já foi|já existe|ultrapassa|estado atual|não pode/iu.test(message)
        ? 409
        : 400;
  return res.status(status).json({ error: message });
}

class EmployeeCompensationController {
  async listPolicies(req: Request, res: Response) {
    try {
      const query = listPolicyQuerySchema.parse(req.query);
      return res.json(await employeePolicyService.list({ restaurantId: tenant(req), ...query }));
    } catch (error) {
      return sendError(res, error);
    }
  }

  async getEmployeePolicies(req: Request, res: Response) {
    try {
      return res.json(
        await employeePolicyService.getForEmployee({
          restaurantId: tenant(req),
          employeeId: positiveIdSchema.parse(req.params.employeeId),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async createPolicy(req: Request, res: Response) {
    try {
      const policy = policySchema.parse(req.body);
      return res.status(201).json(
        await employeePolicyService.createVersion({
          restaurantId: tenant(req),
          employeeId: positiveIdSchema.parse(req.params.employeeId),
          policy: policy as CompensationPolicyInput,
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async closePolicy(req: Request, res: Response) {
    try {
      const input = closePolicySchema.parse(req.body);
      return res.json(
        await employeePolicyService.close({
          restaurantId: tenant(req),
          publicId: uuidSchema.parse(req.params.publicId),
          effectiveUntil: input.effectiveUntil,
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async listEarnings(req: Request, res: Response) {
    try {
      const query = listEarningQuerySchema.parse(req.query);
      return res.json(
        await employeeLedgerService.listAdmin({ restaurantId: tenant(req), ...query }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async createAdjustment(req: Request, res: Response) {
    try {
      const input = adjustmentSchema.parse(req.body);
      return res.status(201).json(
        await employeeLedgerService.createAdjustment({
          restaurantId: tenant(req),
          employeeId: input.employeeId!,
          type: input.type!,
          direction: input.direction,
          amountCents: input.amountCents!,
          reason: input.reason!,
          occurredAt: input.occurredAt,
          idempotencyKey: idempotencyKey(req),
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async listWorkEntries(req: Request, res: Response) {
    try {
      const query = listWorkEntryQuerySchema.parse(req.query);
      return res.json(await employeeWorkEntryService.list({ restaurantId: tenant(req), ...query }));
    } catch (error) {
      return sendError(res, error);
    }
  }

  async createWorkEntry(req: Request, res: Response) {
    try {
      const input = createWorkEntrySchema.parse(req.body);
      return res.status(201).json(
        await employeeWorkEntryService.create({
          restaurantId: tenant(req),
          employeeId: input.employeeId!,
          workDate: input.workDate!,
          minutesWorked: input.minutesWorked!,
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async approveWorkEntry(req: Request, res: Response) {
    try {
      return res.json(
        await employeeWorkEntryService.approve({
          restaurantId: tenant(req),
          publicId: uuidSchema.parse(req.params.publicId),
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async cancelWorkEntry(req: Request, res: Response) {
    try {
      const input = reasonSchema.parse(req.body);
      return res.json(
        await employeeWorkEntryService.cancel({
          restaurantId: tenant(req),
          publicId: uuidSchema.parse(req.params.publicId),
          reason: input.reason,
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async generateSettlement(req: Request, res: Response) {
    try {
      const input = generateSettlementSchema.parse(req.body);
      return res.status(201).json(
        await employeeSettlementService.generate({
          restaurantId: tenant(req),
          employeeId: input.employeeId!,
          referenceMonth: input.referenceMonth!,
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async listSettlements(req: Request, res: Response) {
    try {
      const query = listSettlementQuerySchema.parse(req.query);
      return res.json(
        await employeeSettlementService.listAdmin({ restaurantId: tenant(req), ...query }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async getSettlement(req: Request, res: Response) {
    try {
      return res.json(
        await employeeSettlementService.getAdmin({
          restaurantId: tenant(req),
          publicId: uuidSchema.parse(req.params.publicId),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async confirmSettlement(req: Request, res: Response) {
    try {
      return res.json(
        await employeeSettlementService.confirm({
          restaurantId: tenant(req),
          publicId: uuidSchema.parse(req.params.publicId),
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async cancelSettlement(req: Request, res: Response) {
    try {
      const input = reasonSchema.parse(req.body);
      return res.json(
        await employeeSettlementService.cancel({
          restaurantId: tenant(req),
          publicId: uuidSchema.parse(req.params.publicId),
          reason: input.reason,
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async registerPayment(req: Request, res: Response) {
    try {
      const input = registerPaymentSchema.parse(req.body);
      return res.status(201).json(
        await employeeSettlementService.registerPayment({
          restaurantId: tenant(req),
          settlementPublicId: uuidSchema.parse(req.params.publicId),
          amountCents: input.amountCents!,
          method: input.method!,
          reference: input.reference,
          notes: input.notes,
          idempotencyKey: idempotencyKey(req),
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async reversePayment(req: Request, res: Response) {
    try {
      const input = reasonSchema.parse(req.body);
      return res.json(
        await employeeSettlementService.reversePayment({
          restaurantId: tenant(req),
          paymentPublicId: uuidSchema.parse(req.params.publicId),
          reason: input.reason,
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async getWaiterAssignment(req: Request, res: Response) {
    try {
      return res.json(
        await tableWaiterAssignmentService.get({
          restaurantId: tenant(req),
          tableSessionId: positiveIdSchema.parse(req.params.sessionId),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async assignWaiter(req: Request, res: Response) {
    try {
      const input = assignWaiterSchema.parse(req.body);
      return res.json(
        await tableWaiterAssignmentService.assign({
          restaurantId: tenant(req),
          tableSessionId: positiveIdSchema.parse(req.params.sessionId),
          waiterId: input.waiterId!,
          reason: input.reason,
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async ownEarnings(req: Request, res: Response) {
    try {
      return res.json(
        await employeeLedgerService.listOwn({ restaurantId: tenant(req), actor: actor(req) }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async ownSettlements(req: Request, res: Response) {
    try {
      return res.json(
        await employeeSettlementService.listOwn({ restaurantId: tenant(req), actor: actor(req) }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async ownSettlement(req: Request, res: Response) {
    try {
      return res.json(
        await employeeSettlementService.getOwn({
          restaurantId: tenant(req),
          publicId: uuidSchema.parse(req.params.publicId),
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }

  async ownPayment(req: Request, res: Response) {
    try {
      return res.json(
        await employeeSettlementService.getOwnPayment({
          restaurantId: tenant(req),
          publicId: uuidSchema.parse(req.params.publicId),
          actor: actor(req),
        }),
      );
    } catch (error) {
      return sendError(res, error);
    }
  }
}

export default new EmployeeCompensationController();
