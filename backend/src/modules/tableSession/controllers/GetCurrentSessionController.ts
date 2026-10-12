import { Request, Response } from 'express';
import prisma from '../../../config/prisma.js';

class GetCurrentSessionController {
  async handle(req: Request, res: Response) {
    try {
      const table = await prisma.table.findFirst({
        where: {id: req.tableSession.tableId, restaurantId: req.tableSession.restaurantId},
        select: {number: true},
      });
      if (!table) return res.status(404).json({error: 'Mesa da sessão não encontrada.'});
      return res.status(200).json({
        sessionId: req.tableSession.id,
        sessionPublicId: req.tableSession.publicId,
        tableId: req.tableSession.tableId,
        tableNumber: table.number,
        restaurantId: req.tableSession.restaurantId,
        sessionStatus: req.tableSession.status,
        participant: req.tableParticipant
          ? {
              publicId: req.tableParticipant.publicId,
              displayName: req.tableParticipant.displayName,
              phone: req.tableParticipant.phone,
              authenticated: req.tableParticipant.authenticated,
              orderingBlocked: req.tableParticipant.orderingBlocked,
            }
          : null,
      });
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao obter sessao atual',
      });
    }
  }
}

export default new GetCurrentSessionController();
