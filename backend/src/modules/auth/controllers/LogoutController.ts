import { Request, Response } from 'express';
import logoutService from '../services/LogoutService.js';
import { clearRefreshTokenCookie, readRefreshToken } from './refreshTokenCookie.js';

class LogoutController {
  async handle(req: Request, res: Response) {
    try {
      const refreshToken = readRefreshToken(req);
      if (refreshToken) await logoutService.execute(refreshToken);
      clearRefreshTokenCookie(res);
      return res.status(200).json({ ok: true });
    } catch (error: unknown) {
      clearRefreshTokenCookie(res);
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Falha ao fazer logout',
      });
    }
  }
}

export default new LogoutController();
