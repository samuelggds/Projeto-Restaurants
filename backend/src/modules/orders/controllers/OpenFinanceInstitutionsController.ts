import type { Request, Response } from 'express';
import listOpenFinanceInstitutionsService from '../services/ListOpenFinanceInstitutionsService.js';

class OpenFinanceInstitutionsController {
  async handle(_req: Request, res: Response) {
    try {
      const institutions = await listOpenFinanceInstitutionsService.execute();
      return res.status(200).json({ institutions });
    } catch (error) {
      return res.status(503).json({
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os bancos do Open Finance.',
      });
    }
  }
}

export default new OpenFinanceInstitutionsController();
