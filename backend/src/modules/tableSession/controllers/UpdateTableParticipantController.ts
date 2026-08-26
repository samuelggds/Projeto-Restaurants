import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import updateTableParticipantService from '../services/UpdateTableParticipantService.js';

class UpdateTableParticipantController {
  async handle(req: Request, res: Response) {
    try {
      const participant = await updateTableParticipantService.execute({
        participantId: req.tableParticipant.id,
        tableSessionId: req.tableSession.id,
        restaurantId: req.tableSession.restaurantId,
        displayName: req.body?.displayName,
      });
      return res.status(200).json(participant);
    } catch (error: unknown) {
      return res.status(error instanceof ZodError ? 422 : 400).json({
        error:
          error instanceof ZodError
            ? error.issues[0]?.message || 'Nome inválido.'
            : error instanceof Error
              ? error.message
              : 'Não foi possível atualizar seu nome nesta mesa.',
      });
    }
  }
}

export default new UpdateTableParticipantController();
