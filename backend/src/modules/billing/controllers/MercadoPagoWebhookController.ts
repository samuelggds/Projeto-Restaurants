import { Request, Response } from 'express';
import processMercadoPagoInvoiceWebhookService from '../services/ProcessMercadoPagoInvoiceWebhookService.js';
import { debug, info, error as logError } from '../utils/billingLogger.js';

class MercadoPagoWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const paymentId = req.body?.data?.id || req.body?.id || req.query?.id;
      debug('MP webhook received', { paymentId });

      if (!paymentId) {
        debug('webhook ignored: missing paymentId');
        return res.sendStatus(200);
      }

      const result = await processMercadoPagoInvoiceWebhookService.execute(paymentId);
      if (!result.processed) {
        debug('webhook ignored: payment validation rejected', result);
        return res.sendStatus(200);
      }

      info('webhook processed', { invoiceId: result.invoiceId });
      return res.sendStatus(200);
    } catch (err: unknown) {
      logError('webhook processing failed', {
        message: err instanceof Error ? err.message : String(err),
      });
      return res.sendStatus(500);
    }
  }
}

export default new MercadoPagoWebhookController();
