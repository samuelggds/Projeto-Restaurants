import { Request, Response } from 'express';
import refreshTokenService from '../services/RefreshTokenService.js';
import {
  clearRefreshTokenCookie,
  moveRefreshTokenToCookie,
  readRefreshToken,
} from './refreshTokenCookie.js';
import {
  isPlatformMaintenanceError,
  platformMaintenanceResponse,
} from '../../platform/services/PlatformMaintenanceService.js';

class RefreshTokenController {
  async handle(req: Request, res: Response) {
    try {
      const refreshToken = readRefreshToken(req);
      const result = await refreshTokenService.execute(refreshToken);
      return res.status(200).json(moveRefreshTokenToCookie(res, result));
    } catch (error: unknown) {
      if (isPlatformMaintenanceError(error)) {
        // Preserva o refresh token válido para que a sessão possa voltar sem
        // novo login assim que a manutenção terminar.
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Retry-After', '60');
        return res
          .status(error.statusCode)
          .json(platformMaintenanceResponse(error.message, req.requestId));
      }

      clearRefreshTokenCookie(res);
      return res.status(401).json({
        error: error instanceof Error ? error.message : 'Falha ao renovar sessao',
      });
    }
  }
}

export default new RefreshTokenController();
