import type { NextFunction, Request, Response } from 'express';
import adminPortalAccessService, {
  AdminPortalAccessError,
} from '../services/AdminPortalAccessService.js';

function firstParameter(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export class AdminPortalController {
  async exchange(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminPortalAccessService.exchange(
        firstParameter(req.params.slug),
        req.body?.key,
      );
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof AdminPortalAccessError) {
        return res.status(error.statusCode).json({ error: error.message, code: error.code });
      }
      return next(error);
    }
  }

  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminPortalAccessService.verifyGrant(
        firstParameter(req.params.slug),
        req.body?.grant,
      );
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof AdminPortalAccessError) {
        return res.status(error.statusCode).json({ error: error.message, code: error.code });
      }
      return next(error);
    }
  }
}

export default new AdminPortalController();
