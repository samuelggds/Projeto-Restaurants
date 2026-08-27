import { Request, Response } from 'express';
import updateMfaPreferenceService from '../services/UpdateMfaPreferenceService.js';
import { clearRefreshTokenCookie } from './refreshTokenCookie.js';

class UpdateMfaPreferenceController {
  async handle(req: Request, res: Response) {
    try {
      const result = await updateMfaPreferenceService.execute(req.user.id, req.body?.enabled);
      clearRefreshTokenCookie(res);

      return res.status(200).json({ ...result, reauthenticationRequired: true });
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : 'Erro ao atualizar verificacao em duas etapas',
      });
    }
  }
}

export default new UpdateMfaPreferenceController();
