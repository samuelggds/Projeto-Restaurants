import type { Request, Response } from 'express';
import deleteTableServiceCallService from '../services/DeleteTableServiceCallService.js';

class DeleteTableServiceCallController {
  async handle(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await deleteTableServiceCallService.execute({
        id,
        restaurantId: req.user.restaurantId,
      });
      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível excluir o chamado.',
      });
    }
  }
}

export default new DeleteTableServiceCallController();
