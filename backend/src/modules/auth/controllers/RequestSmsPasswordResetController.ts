import { Request, Response } from 'express';
import googlePhoneVerificationService from '../services/GooglePhoneVerificationService.js';

class RequestSmsPasswordResetController {
  async handle(req: Request, res: Response) {
    try {
      const result = await googlePhoneVerificationService.requestPasswordReset(
        req.body?.phone,
        req.body?.captchaResponse,
      );
      return res.json(result);
    } catch (error) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível iniciar a recuperação por SMS.',
      });
    }
  }
}

export default new RequestSmsPasswordResetController();
