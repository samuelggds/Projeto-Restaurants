import type { NextFunction, Request, Response } from 'express';
import reviewService from '../services/LalamoveReviewService.js';

function context(req: Request) {
  return {
    ipAddress: String(req.ip || '').trim().slice(0, 128) || null,
    requestId: String(req.requestId || '').trim().slice(0, 191) || null,
    userAgent: String(req.headers['user-agent'] || '').trim().slice(0, 1000) || null,
  };
}

class LalamoveReviewController {
  async queue(req: Request, res: Response, next: NextFunction) {
    try {
      res.setHeader('Cache-Control', 'no-store');
      return res.json(
        await reviewService.listRequests(req.user?.id, req.query.cursor),
      );
    } catch (error) {
      return next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      res.setHeader('Cache-Control', 'no-store');
      return res.json(
        await reviewService.updateRequest(
          req.user?.id,
          req.params.restaurantId,
          req.body,
          context(req),
        ),
      );
    } catch (error) {
      return next(error);
    }
  }
}

export default new LalamoveReviewController();
