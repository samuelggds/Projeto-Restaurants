import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import createTablePaymentIntentService from '../services/CreateTablePaymentIntentService.js';
import { TablePaymentError } from '../services/tablePaymentSupport.js';

class CreateTablePaymentIntentController {
  async handle(req: Request, res: Response) {
    try {
      const result = await createTablePaymentIntentService.execute(
        {
          tableSessionId: Number(req.tableSession?.id),
          sessionPublicId: String(req.tableSession?.publicId || ''),
          restaurantId: Number(req.tableSession?.restaurantId),
          participantId: Number(req.tableParticipant?.id),
        },
        {
          ...(req.body || {}),
          idempotencyKey:
            String(req.header('idempotency-key') || '').trim() || req.body?.idempotencyKey,
        },
      );

      res.setHeader('Cache-Control', 'no-store');
      return res.status(result.idempotentReplay ? 200 : 201).json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: error.issues[0]?.message || 'Dados do pagamento inválidos.',
          code: 'INVALID_TABLE_PAYMENT_INPUT',
        });
      }

      if (error instanceof TablePaymentError) {
        return res.status(error.statusCode).json({ error: error.message, code: error.code });
      }

      console.error(
        '[CREATE_TABLE_PAYMENT_INTENT_ERROR]',
        error instanceof Error ? error.message : String(error),
      );
      return res.status(500).json({
        error: 'Não foi possível iniciar o pagamento da mesa.',
        code: 'TABLE_PAYMENT_INTERNAL_ERROR',
      });
    }
  }
}

export default new CreateTablePaymentIntentController();
