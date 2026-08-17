import { Request, Response } from 'express';

class GetCurrentSessionController {
  async handle(req: Request, res: Response) {
    try {
      return res.status(200).json({
        sessionId: req.tableSession.id,
        tableId: req.tableSession.tableId,
        restaurantId: req.tableSession.restaurantId,
      });
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao obter sessao atual',
      });
    }
  }
}

export default new GetCurrentSessionController();
