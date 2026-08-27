import { Request, Response } from 'express';
import refreshTokenService from '../services/RefreshTokenService.js';
import {
  clearRefreshTokenCookie,
  moveRefreshTokenToCookie,
  readRefreshToken,
} from './refreshTokenCookie.js';

class RefreshTokenController {
  async handle(req: Request, res: Response) {
    try {
      const refreshToken = readRefreshToken(req);
      const result = await refreshTokenService.execute(refreshToken);
      return res.status(200).json(moveRefreshTokenToCookie(res, result));
    } catch (error: unknown) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        error: error instanceof Error ? error.message : 'Falha ao renovar sessao',
      });
    }
  }
}

export default new RefreshTokenController();
