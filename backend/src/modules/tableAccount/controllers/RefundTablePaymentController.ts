import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import refundTablePaymentService from '../services/RefundTablePaymentService.js';
import { TablePaymentError } from '../services/tablePaymentSupport.js';

class RefundTablePaymentController {
  async handle(req: Request, res: Response) {
    try {
      const result = await refundTablePaymentService.execute(
        {
          publicId: String(req.params.publicId || '').trim(),
          actor: {
            id: Number(req.user?.id),
            role: String(req.user?.role || '') as never,
            subRole: (req.user?.subRole || null) as never,
            restaurantId: Number(req.user?.restaurantId || 0),
          },
        },
        req.body,
      );
      res.setHeader('Cache-Control', 'no-store');
      return res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: error.issues[0]?.message || 'Dados do estorno inválidos.',
          code: 'INVALID_TABLE_PAYMENT_REFUND_INPUT',
        });
      }
      if (error instanceof TablePaymentError) {
        return res.status(error.statusCode).json({ error: error.message, code: error.code });
      }
      console.error(
        '[REFUND_TABLE_PAYMENT_ERROR]',
        error instanceof Error ? error.message : String(error),
      );
      return res.status(500).json({ error: 'Não foi possível estornar este pagamento.' });
    }
  }
}

export default new RefundTablePaymentController();
