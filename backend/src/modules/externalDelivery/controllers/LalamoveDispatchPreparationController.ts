import type { Request, Response } from 'express';
import { z } from 'zod';
import service from '../services/LalamoveDispatchPreparationService.js';
import { LalamoveQuoteError } from '../services/LalamoveQuotationService.js';

const schema = z.object({ requestKey: z.string().uuid() }).strict();

class LalamoveDispatchPreparationController {
  async prepare(req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    const payload = schema.safeParse(req.body);
    if (!payload.success) return res.status(400).json({ error: 'Chave de solicitação inválida.' });
    try {
      const dispatch = await service.prepare({
        restaurantId: Number(req.user?.restaurantId),
        actorId: Number(req.user?.id),
        orderId: Number(req.params.orderId),
        requestKey: payload.data.requestKey,
      });
      return res.status(200).json({ dispatch });
    } catch (error) {
      return res.status(error instanceof LalamoveQuoteError ? error.statusCode : 503).json({
        error: error instanceof LalamoveQuoteError ? error.message : 'Não foi possível preparar o despacho parceiro.',
      });
    }
  }
}

export default new LalamoveDispatchPreparationController();
