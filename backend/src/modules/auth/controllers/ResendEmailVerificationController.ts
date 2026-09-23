import { Request, Response } from 'express';
import emailVerificationService from '../services/EmailVerificationService.js';

class ResendEmailVerificationController {
  async handle(req: Request, res: Response) {
    const { email, restaurantSlug } = req.body || {};
    const result = await emailVerificationService.resend(email, restaurantSlug);
    return res.json(result);
  }
}

export default new ResendEmailVerificationController();
