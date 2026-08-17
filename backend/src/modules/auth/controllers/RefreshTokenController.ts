import { Request, Response } from 'express';
import refreshTokenService from '../services/RefreshTokenService.js';

class RefreshTokenController {
  async handle(req: Request, res: Response) {
    try {
      const refreshToken = String(req.body?.refreshToken || '');
      const result = await refreshTokenService.execute(refreshToken);
      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(401).json({
        error: error instanceof Error ? error.message : 'Falha ao renovar sessao',
      });
    }
  }
}

export default new RefreshTokenController();
