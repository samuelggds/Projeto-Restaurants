import type { Request, Response } from 'express';
import cancelTablePaymentIntentService from '../services/CancelTablePaymentIntentService.js';
import { TablePaymentError } from '../services/tablePaymentSupport.js';

class CancelTablePaymentIntentController {
  async handle(req: Request, res: Response) {
    try {
      const result = await cancelTablePaymentIntentService.execute({
        publicId: String(req.params.publicId || '').trim(),
        tableSessionId: Number(req.tableSession?.id),
        sessionPublicId: String(req.tableSession?.publicId || ''),
        restaurantId: Number(req.tableSession?.restaurantId),
        participantId: Number(req.tableParticipant?.id),
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.json(result);
    } catch (error) {
      if (error instanceof TablePaymentError) {
        return res.status(error.statusCode).json({ error: error.message, code: error.code });
      }
      console.error(
        '[CANCEL_TABLE_PAYMENT_ERROR]',
        error instanceof Error ? error.message : String(error),
      );
      return res.status(500).json({ error: 'Não foi possível cancelar este pagamento.' });
    }
  }
}

export default new CancelTablePaymentIntentController();
