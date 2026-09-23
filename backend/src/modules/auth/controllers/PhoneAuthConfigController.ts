import { Request, Response } from 'express';
import googlePhoneVerificationService from '../services/GooglePhoneVerificationService.js';

class PhoneAuthConfigController {
  handle(_req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    return res.json(googlePhoneVerificationService.config());
  }
}

export default new PhoneAuthConfigController();
