import type { NextFunction, Request, Response } from 'express';
import { SuperAdminError } from '../domain/superAdminErrors.js';
import getSuperAdminDashboardService from '../services/GetSuperAdminDashboardService.js';
import getSuperAdminRestaurantService from '../services/GetSuperAdminRestaurantService.js';
import updatePlatformSettingsService from '../services/UpdatePlatformSettingsService.js';
import updatePlatformPlanService from '../services/UpdatePlatformPlanService.js';
import updateRestaurantAccessService from '../services/UpdateRestaurantAccessService.js';
import updateRestaurantSubscriptionService from '../services/UpdateRestaurantSubscriptionService.js';
import createRestaurantAdministratorService from '../services/CreateRestaurantAdministratorService.js';
import updateAdministratorAccessService from '../services/UpdateAdministratorAccessService.js';
import sendSuperAdminSupportMessageService from '../services/SendSuperAdminSupportMessageService.js';
import adminPortalAccessService from '../../adminPortal/services/AdminPortalAccessService.js';
import type { AuditContext } from '../repositories/SuperAdminRepository.js';

function firstParameter(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function auditContext(req: Request): AuditContext {
  const actorUserId = Number(req.user?.id);
  if (!Number.isInteger(actorUserId) || actorUserId <= 0) {
    throw new SuperAdminError('Não autenticado.', 401, 'UNAUTHENTICATED');
  }

  return {
    actorUserId,
    ipAddress: String(req.ip || '').trim().slice(0, 128) || null,
    requestId: String(req.requestId || '').trim().slice(0, 191) || null,
    userAgent: String(req.headers['user-agent'] || '').trim().slice(0, 1000) || null,
  };
}

export class SuperAdminController {
  async dashboard(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json(await getSuperAdminDashboardService.execute());
    } catch (error) {
      return next(error);
    }
  }

  async restaurant(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(firstParameter(req.params.id));
      if (!Number.isInteger(id) || id <= 0) {
        throw new SuperAdminError('Restaurante inválido.', 400, 'INVALID_RESTAURANT');
      }
      return res.status(200).json(await getSuperAdminRestaurantService.execute(id));
    } catch (error) {
      return next(error);
    }
  }

  async settings(req: Request, res: Response, next: NextFunction) {
    try {
      return res
        .status(200)
        .json(await updatePlatformSettingsService.execute(req.body, auditContext(req)));
    } catch (error) {
      return next(error);
    }
  }

  async plan(req: Request, res: Response, next: NextFunction) {
    try {
      return res
        .status(200)
        .json(
          await updatePlatformPlanService.execute(
            firstParameter(req.params.code),
            req.body,
            auditContext(req),
          ),
        );
    } catch (error) {
      return next(error);
    }
  }

  async restaurantAccess(req: Request, res: Response, next: NextFunction) {
    try {
      return res
        .status(200)
        .json(
          await updateRestaurantAccessService.execute(
            firstParameter(req.params.id),
            req.body,
            auditContext(req),
          ),
        );
    } catch (error) {
      return next(error);
    }
  }

  async restaurantSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      return res
        .status(200)
        .json(
          await updateRestaurantSubscriptionService.execute(
            firstParameter(req.params.id),
            req.body,
            auditContext(req),
          ),
        );
    } catch (error) {
      return next(error);
    }
  }

  async createAdministrator(req: Request, res: Response, next: NextFunction) {
    try {
      return res
        .status(201)
        .json(
          await createRestaurantAdministratorService.execute(
            firstParameter(req.params.id),
            req.body,
            auditContext(req),
          ),
        );
    } catch (error) {
      return next(error);
    }
  }

  async administratorAccess(req: Request, res: Response, next: NextFunction) {
    try {
      return res
        .status(200)
        .json(
          await updateAdministratorAccessService.execute(
            firstParameter(req.params.id),
            req.body,
            auditContext(req),
          ),
        );
    } catch (error) {
      return next(error);
    }
  }

  async rotateAdminPortalKey(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(firstParameter(req.params.id));
      if (!Number.isInteger(id) || id <= 0) {
        throw new SuperAdminError('Restaurante inválido.', 400, 'INVALID_RESTAURANT');
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(201).json(await adminPortalAccessService.rotate(id, auditContext(req)));
    } catch (error) {
      return next(error);
    }
  }

  async revokeAdminPortalKey(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(firstParameter(req.params.id));
      if (!Number.isInteger(id) || id <= 0) {
        throw new SuperAdminError('Restaurante inválido.', 400, 'INVALID_RESTAURANT');
      }
      return res.status(200).json(await adminPortalAccessService.revoke(id, auditContext(req)));
    } catch (error) {
      return next(error);
    }
  }

  async supportMessage(req: Request, res: Response, next: NextFunction) {
    try {
      return res
        .status(201)
        .json(
          await sendSuperAdminSupportMessageService.execute(
            firstParameter(req.params.restaurantId),
            req.body,
            auditContext(req),
          ),
        );
    } catch (error) {
      return next(error);
    }
  }
}

export default new SuperAdminController();
