import { Request, Response } from 'express';
import crypto from 'node:crypto';
import billingRepository from '../repositories/BillingRepository.js';
import processPaymentService from '../services/ProcessPaymentService.js';
import { extractInvoiceId, isApprovedPaymentStatus } from '../utils/webhookUtils.js';
import { debug, info, error as logError } from '../utils/billingLogger.js';

class BillingWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const isEnabled =
        process.env.NODE_ENV !== 'production' &&
        String(process.env.ENABLE_TEST_PAYMENT_WEBHOOK || 'false').toLowerCase() === 'true';
      const configuredSecret = String(process.env.TEST_PAYMENT_WEBHOOK_SECRET || '').trim();
      const receivedSecret = String(req.headers['x-test-webhook-secret'] || '').trim();

      if (!isEnabled || !configuredSecret || !receivedSecret) {
        return res.sendStatus(404);
      }

      const configuredBuffer = Buffer.from(configuredSecret);
      const receivedBuffer = Buffer.from(receivedSecret);
      const secretMatches =
        configuredBuffer.length === receivedBuffer.length &&
        crypto.timingSafeEqual(configuredBuffer, receivedBuffer);

      if (!secretMatches) {
        return res.sendStatus(404);
      }

      const payment = req.body;

      const paymentId = payment.data?.id || payment.id || payment.data?.payment_id;

      debug('test webhook received', { paymentId });

      if (!paymentId) {
        debug('test webhook ignored: missing paymentId');
        return res.sendStatus(200);
      }

      const paymentStatus = payment.status || payment.data?.status || payment.action;
      if (!isApprovedPaymentStatus(paymentStatus)) {
        debug('test webhook ignored: payment not approved', {
          paymentStatus,
        });
        return res.sendStatus(200);
      }

      const invoiceId = extractInvoiceId(payment);

      if (!invoiceId) {
        debug('test webhook ignored: missing invoiceId');
        return res.sendStatus(200);
      }

      const invoice = await billingRepository.findInvoiceById(invoiceId);

      if (!invoice) {
        debug('test webhook ignored: invoice not found');
        return res.sendStatus(200);
      }

      if (invoice.status === 'PAGO') {
        debug('test webhook ignored: invoice already paid');
        return res.sendStatus(200);
      }

      await processPaymentService.execute({ invoiceId });
      info('test webhook processed', { invoiceId });

      return res.sendStatus(200);
    } catch (error: unknown) {
      logError('test webhook failed', {
        message: error instanceof Error ? error.message : String(error),
      });

      return res.sendStatus(200);
    }
  }
}

export default new BillingWebhookController();
