import type { Request, Response } from 'express';
import reconcileTablePaymentService from '../services/ReconcileTablePaymentService.js';
import { TablePaymentError } from '../services/tablePaymentSupport.js';

class ReconcileTablePaymentController {
  async handle(req: Request, res: Response) {
    try {
      const result = await reconcileTablePaymentService.execute({
        publicId: String(req.params.publicId || '').trim(),
        tableSessionId: Number(req.tableSession?.id),
        sessionPublicId: String(req.tableSession?.publicId || ''),
        restaurantId: Number(req.tableSession?.restaurantId),
        participantId: Number(req.tableParticipant?.id),
        participantUserId: req.tableParticipant?.userId
          ? Number(req.tableParticipant.userId)
          : null,
        participantName: String(req.tableParticipant?.displayName || '').trim() || null,
        participantPhone: String(req.tableParticipant?.phone || '').trim() || null,
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.json(result);
    } catch (error) {
      if (error instanceof TablePaymentError) {
        return res.status(error.statusCode).json({ error: error.message, code: error.code });
      }
      console.error(
        '[RECONCILE_TABLE_PAYMENT_ERROR]',
        error instanceof Error ? error.message : String(error),
      );
      return res.status(502).json({
        error: 'Não foi possível consultar o pagamento agora.',
        code: 'TABLE_PAYMENT_RECONCILIATION_ERROR',
      });
    }
  }
}

export default new ReconcileTablePaymentController();
