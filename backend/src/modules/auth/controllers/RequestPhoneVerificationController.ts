import { Request, Response } from 'express';
import googlePhoneVerificationService from '../services/GooglePhoneVerificationService.js';

class RequestPhoneVerificationController {
  async handle(req: Request, res: Response) {
    try {
      const result = await googlePhoneVerificationService.requestEnrollment(
        Number(req.user?.id),
        req.body?.currentPassword,
        req.body?.captchaResponse,
      );
      return res.json(result);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível enviar o código por SMS.',
      });
    }
  }
}

export default new RequestPhoneVerificationController();
