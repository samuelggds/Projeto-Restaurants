import { Request, Response } from 'express';
import googleAuthService from '../services/GoogleAuthService.js';
import { moveRefreshTokenToCookie } from './refreshTokenCookie.js';
import {
  isPlatformMaintenanceError,
  platformMaintenanceResponse,
} from '../../platform/services/PlatformMaintenanceService.js';

class GoogleAuthController {
  async handle(req: Request, res: Response) {
    try {
      const { idToken } = req.body;

      const result = await googleAuthService.execute({ idToken });

      return res.json(moveRefreshTokenToCookie(res, result));
    } catch (error: unknown) {
      if (isPlatformMaintenanceError(error)) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Retry-After', '60');
        return res
          .status(error.statusCode)
          .json(platformMaintenanceResponse(error.message, req.requestId));
      }

      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro no login Google',
      });
    }
  }
}

export default new GoogleAuthController();
