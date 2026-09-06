import { Request, Response } from 'express';
import loginService from '../services/LoginService.js';
import { moveRefreshTokenToCookie } from './refreshTokenCookie.js';
import {
  isPlatformMaintenanceError,
  platformMaintenanceResponse,
} from '../../platform/services/PlatformMaintenanceService.js';

class LoginController {
  async handle(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const result = await loginService.execute({
        email,
        password,
      });

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
        error: error instanceof Error ? error.message : 'Erro ao fazer login',
      });
    }
  }
}

export default new LoginController();
