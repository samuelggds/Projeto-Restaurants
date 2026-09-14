import { Request, Response } from 'express';
import loginMfaService, { MfaResendCooldownError } from '../services/LoginMfaService.js';
import {
  isPlatformMaintenanceError,
  platformMaintenanceResponse,
} from '../../platform/services/PlatformMaintenanceService.js';

class SelectLoginMfaChannelController {
  async handle(req: Request, res: Response) {
    try {
      const { mfaToken, channel } = req.body;
      const result = await loginMfaService.selectChannel(
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
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Falha ao selecionar canal de verificacao',
      });
    }
  }
}

export default new SelectLoginMfaChannelController();
