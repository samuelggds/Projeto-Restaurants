import type { Request, Response } from 'express';
import openFinancePixPaymentService from '../services/OpenFinancePixPaymentService.js';

class OpenFinanceInstitutionsController {
  async handle(_req: Request, res: Response) {
    try {
      const institutions = await openFinancePixPaymentService.listInstitutions();
      return res.status(200).json({ institutions });
    } catch (error: unknown) {
      return res.status(503).json({
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os bancos disponíveis.',
      });
    }
  }
}

export default new OpenFinanceInstitutionsController();
