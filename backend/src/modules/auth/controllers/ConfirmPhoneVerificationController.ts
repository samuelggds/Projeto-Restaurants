import { Request, Response } from 'express';
import googlePhoneVerificationService from '../services/GooglePhoneVerificationService.js';

class ConfirmPhoneVerificationController {
  async handle(req: Request, res: Response) {
    try {
      const result = await googlePhoneVerificationService.confirmEnrollment(
        Number(req.user?.id),
        req.body?.challengeId,
        req.body?.code,
      );
      return res.json(result);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Código inválido ou expirado.',
      });
    }
  }
}

export default new ConfirmPhoneVerificationController();
