import type { NextFunction, Request, Response } from 'express';
import managedServiceService from '../services/ManagedServiceService.js';

function superActor(req: Request) {
  return {
    userId: Number(req.user?.id || 0),
    userName: req.user?.name ?? null,
    userRole: req.user?.role ?? null,
    ipAddress: String(req.ip || '').trim().slice(0, 128) || null,
    requestId: String(req.requestId || '').trim().slice(0, 191) || null,
    userAgent: String(req.headers['user-agent'] || '').trim().slice(0, 1000) || null,
  };
}

class ManagedServiceController {
  async adminOverview(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json(
        await managedServiceService.getAdminOverview({
          userId: Number(req.user?.id || 0),
          restaurantId: Number(req.user?.restaurantId || 0),
          userName: req.user?.name ?? null,
          userRole: req.user?.role ?? null,
        }),
      );
    } catch (error) {
      return next(error);
    }
  }

  async createRequest(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(201).json(
        await managedServiceService.createAdminRequest(req.body, {
          userId: Number(req.user?.id || 0),
          restaurantId: Number(req.user?.restaurantId || 0),
          userName: req.user?.name ?? null,
          userRole: req.user?.role ?? null,
        }),
      );
    } catch (error) {
      return next(error);
    }
  }

  async superQueue(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json(await managedServiceService.listSuperAdminQueue());
    } catch (error) {
      return next(error);
    }
  }

  async updateImplementation(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json(
        await managedServiceService.updateImplementation(req.params.restaurantId, req.body, superActor(req)),
      );
    } catch (error) {
      return next(error);
    }
  }

  async updateRequest(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json(
        await managedServiceService.updateManagedRequest(req.params.requestId, req.body, superActor(req)),
      );
    } catch (error) {
      return next(error);
    }
  }
}

export default new ManagedServiceController();
