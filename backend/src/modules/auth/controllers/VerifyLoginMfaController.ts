import { Request, Response } from 'express';
import loginMfaService from '../services/LoginMfaService.js';
import { moveRefreshTokenToCookie } from './refreshTokenCookie.js';
import {
  isPlatformMaintenanceError,
  platformMaintenanceResponse,
} from '../../platform/services/PlatformMaintenanceService.js';

class VerifyLoginMfaController {
  async handle(req: Request, res: Response) {
    try {
      const { mfaToken, code } = req.body;

      const result = await loginMfaService.verifyAndIssueTokens({
        mfaToken,
        code,
      });

      return res.status(200).json(moveRefreshTokenToCookie(res, result));
    } catch (error: unknown) {
      if (isPlatformMaintenanceError(error)) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Retry-After', '60');
        return res
          .status(error.statusCode)
          .json(platformMaintenanceResponse(error.message, req.requestId));
      }

      return res.status(401).json({
        error: error instanceof Error ? error.message : 'Falha na verificacao de login',
      });
    }
  }
}

export default new VerifyLoginMfaController();
