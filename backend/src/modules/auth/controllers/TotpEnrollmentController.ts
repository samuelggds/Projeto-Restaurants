import { Request, Response } from 'express';
import { clearRefreshTokenCookie } from './refreshTokenCookie.js';
import {
  getTotpStatus, startTotpEnrollment, confirmTotpEnrollment,
} from '../services/TotpEnrollmentService.js';

class TotpEnrollmentController {
  async status(req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      return res.json(await getTotpStatus(Number(req.user.id)));
    } catch {
      return res.status(403).json({ error: 'Operação indisponível para esta conta.' });
    }
  }

  async start(req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      return res.json(await startTotpEnrollment(Number(req.user.id), String(req.body?.currentPassword || '')));
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível configurar o autenticador.',
      });
    }
  }

  async confirm(req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const result = await confirmTotpEnrollment(Number(req.user.id), String(req.body?.code || ''));
      clearRefreshTokenCookie(res);
      return res.json(result);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível validar o código.',
      });
    }
  }
}

export default new TotpEnrollmentController();
