import { Request, Response } from 'express';
import googlePhoneVerificationService from '../services/GooglePhoneVerificationService.js';

class PhoneAuthConfigController {
  async handle(_req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    return res.json(await googlePhoneVerificationService.config());
  }
}

export default new PhoneAuthConfigController();
