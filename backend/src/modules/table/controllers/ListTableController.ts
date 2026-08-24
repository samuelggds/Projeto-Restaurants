import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import listTableService from '../services/ListTableService.js';

class ListTableController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;

      const tables = await listTableService.execute({
        restaurantId,
        includeQrToken: req.user.role === UserRole.ADMIN,
      });

      return res.status(200).json(tables);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao listar mesas',
      });
    }
  }
}

export default new ListTableController();
