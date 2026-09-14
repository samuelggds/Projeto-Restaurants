import { Request, Response } from 'express';
import loginMfaService, { MfaResendCooldownError } from '../services/LoginMfaService.js';
import {
  isPlatformMaintenanceError,
  platformMaintenanceResponse,
} from '../../platform/services/PlatformMaintenanceService.js';

class ResendLoginMfaController {
  async handle(req: Request, res: Response) {
    try {
      const { mfaToken, channel } = req.body;
      const result = await loginMfaService.resend(
        String(mfaToken || '').trim(),
        String(channel || '').trim(),
      );

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(result);
    } catch (error: unknown) {
      if (error instanceof MfaResendCooldownError) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Retry-After', String(error.retryAfterSeconds));
        return res.status(429).json({
          error: error.message,
          code: 'MFA_RESEND_COOLDOWN',
          retryAfterSeconds: error.retryAfterSeconds,
        });
      }

      if (isPlatformMaintenanceError(error)) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Retry-After', '60');
        return res
          .status(error.statusCode)
          .json(platformMaintenanceResponse(error.message, req.requestId));
      }

      res.setHeader('Cache-Control', 'no-store');
      return res.status(401).json({
        error: error instanceof Error ? error.message : 'Falha ao reenviar o codigo de verificacao',
      });
    }
  }
}

export default new ResendLoginMfaController();
