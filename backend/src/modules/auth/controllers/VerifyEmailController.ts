import { Request, Response } from 'express';
import emailVerificationService from '../services/EmailVerificationService.js';

class VerifyEmailController {
  async handle(req: Request, res: Response) {
    const result = await emailVerificationService.verify(req.query.token);
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(303, result.redirectUrl);
  }
}

export default new VerifyEmailController();
