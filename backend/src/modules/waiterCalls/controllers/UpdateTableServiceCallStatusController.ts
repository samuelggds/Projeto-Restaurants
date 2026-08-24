import type { Request, Response } from 'express';
import updateTableServiceCallStatusService from '../services/UpdateTableServiceCallStatusService.js';

class UpdateTableServiceCallStatusController {
  async handle(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const call = await updateTableServiceCallStatusService.execute({
        id,
        restaurantId: req.user.restaurantId,
        actorUserId: req.user.id,
        actorRole: req.user.role,
        status: req.body?.status,
      });
      return res.status(200).json(call);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível atualizar o chamado.',
      });
    }
  }
}

export default new UpdateTableServiceCallStatusController();
