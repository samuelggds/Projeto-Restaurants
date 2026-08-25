import type { Request, Response } from 'express';
import deleteTableService from '../services/DeleteTableService.js';

class DeleteTableController {
  async handle(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const table = await deleteTableService.execute({
        id,
        restaurantId: req.user.restaurantId,
      });
      return res.status(200).json(table);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível excluir a mesa.',
      });
    }
  }
}

export default new DeleteTableController();
