import type { Request, Response } from 'express';
import createTableServiceCallService from '../services/CreateTableServiceCallService.js';

class CreateTableServiceCallController {
  async handle(req: Request, res: Response) {
    try {
      const result = await createTableServiceCallService.execute({
        sessionId: req.tableSession.id,
        tableId: req.tableSession.tableId,
        restaurantId: req.tableSession.restaurantId,
        participantId: req.tableParticipant.id,
        type: req.body?.type,
      });

      return res.status(result.duplicate ? 200 : 201).json({
        ...result.call,
        duplicate: result.duplicate,
      });
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível enviar o chamado.',
      });
    }
  }
}

export default new CreateTableServiceCallController();
