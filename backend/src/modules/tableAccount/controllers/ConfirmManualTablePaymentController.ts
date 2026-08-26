import type { Request, Response } from 'express';
import confirmManualTablePaymentService from '../services/ConfirmManualTablePaymentService.js';
import { TablePaymentError } from '../services/tablePaymentSupport.js';

class ConfirmManualTablePaymentController {
  async handle(req: Request, res: Response) {
    try {
      const result = await confirmManualTablePaymentService.execute({
        publicId: String(req.params.publicId || '').trim(),
        actor: {
          id: Number(req.user?.id),
          role: String(req.user?.role || '') as never,
          subRole: (req.user?.subRole || null) as never,
          restaurantId: Number(req.user?.restaurantId || 0),
        },
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.json(result);
    } catch (error) {
      if (error instanceof TablePaymentError) {
        return res.status(error.statusCode).json({ error: error.message, code: error.code });
      }
      console.error(
        '[CONFIRM_MANUAL_TABLE_PAYMENT_ERROR]',
        error instanceof Error ? error.message : String(error),
      );
      return res.status(500).json({ error: 'Não foi possível confirmar este pagamento.' });
    }
  }
}

export default new ConfirmManualTablePaymentController();
