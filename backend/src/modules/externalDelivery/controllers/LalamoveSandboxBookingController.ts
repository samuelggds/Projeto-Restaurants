import type { Request, Response } from 'express';
import { z } from 'zod';
import service from '../services/LalamoveSandboxBookingService.js';
import { LalamoveQuoteError } from '../services/LalamoveQuotationService.js';

const bodySchema = z.object({ expectedVersion: z.number().int().positive() }).strict();

class LalamoveSandboxBookingController {
  async book(req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Versão do despacho inválida.' });
    try {
      const dispatch = await service.book({
        restaurantId: Number(req.user?.restaurantId),
        actorId: Number(req.user?.id),
        orderId: Number(req.params.orderId),
        expectedVersion: parsed.data.expectedVersion,
      });
      return res.json({ dispatch });
    } catch (error) {
      return res.status(error instanceof LalamoveQuoteError ? error.statusCode : 503).json({
        error: error instanceof LalamoveQuoteError ? error.message : 'Falha na solicitação de entrega parceira.',
      });
    }
  }
}
export default new LalamoveSandboxBookingController();
