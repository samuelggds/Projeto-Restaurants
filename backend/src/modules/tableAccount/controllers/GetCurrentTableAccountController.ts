import type { Request, Response } from 'express';
import getCurrentTableAccountService, {
  TableAccountAccessError,
} from '../services/GetCurrentTableAccountService.js';

class GetCurrentTableAccountController {
  async handle(req: Request, res: Response) {
    try {
      const account = await getCurrentTableAccountService.execute({
        tableSessionId: req.tableSession.id,
        restaurantId: req.tableSession.restaurantId,
        participantId: req.tableParticipant.id,
        participantPublicId: req.tableParticipant.publicId,
      });

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(account);
    } catch (error: unknown) {
      const expected = error instanceof TableAccountAccessError;
      return res.status(expected ? 404 : 500).json({
        error: expected ? error.message : 'Não foi possível carregar a conta desta mesa.',
      });
    }
  }
}

export default new GetCurrentTableAccountController();
