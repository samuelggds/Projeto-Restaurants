import type { Request, Response } from 'express';
import processTablePaymentWebhookService from '../services/ProcessTablePaymentWebhookService.js';
import { TablePaymentError } from '../services/tablePaymentSupport.js';

class FakeTablePaymentWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const result = await processTablePaymentWebhookService.execute({
        headers: req.headers,
        body: req.body,
      });
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof TablePaymentError) {
        return res.status(error.statusCode).json({ error: error.message, code: error.code });
      }
      const message = error instanceof Error ? error.message : String(error);
      if (/assinatura|desativado/i.test(message)) {
        return res.status(401).json({ error: 'Webhook de pagamento não autorizado.' });
      }
      console.error(
        '[FAKE_TABLE_PAYMENT_WEBHOOK_ERROR]',
        error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      );
      return res.status(500).json({ received: false });
    }
  }
}

export default new FakeTablePaymentWebhookController();
