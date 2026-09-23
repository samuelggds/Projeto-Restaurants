import { Request, Response } from 'express';
import googlePhoneVerificationService from '../services/GooglePhoneVerificationService.js';

class ResetPasswordBySmsController {
  async handle(req: Request, res: Response) {
    try {
      const result = await googlePhoneVerificationService.resetPassword({
        challengeId: req.body?.challengeId,
        code: req.body?.code,
        newPassword: String(req.body?.newPassword || ''),
        confirmPassword: String(req.body?.confirmPassword || ''),
      });
      return res.json(result);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Código inválido ou expirado.',
      });
    }
  }
}

export default new ResetPasswordBySmsController();
