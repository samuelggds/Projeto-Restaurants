import type { Request, Response } from 'express';
import { authenticateMercadoPagoWebhook } from '../../payments/providers/mercadoPagoWebhookSignature.js';
import paymentTerminalRepository from '../repositories/PaymentTerminalRepository.js';
import paymentTerminalService from '../services/PaymentTerminalService.js';
import pickupPaymentService from '../../pickupPayments/services/PickupPaymentService.js';

class MercadoPagoPointWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const providerOrderId = authenticateMercadoPagoWebhook(req, res);
      if (!providerOrderId) return res;

      const localPayment = await paymentTerminalRepository.findByProviderOrderId(
        'MERCADO_PAGO',
        providerOrderId,
      );
      if (!localPayment) return res.sendStatus(200);

      if (await pickupPaymentService.reconcilePointWebhook(localPayment))
        return res.sendStatus(200);

      await paymentTerminalService.reconcilePointOrder(
        providerOrderId,
        Number(localPayment.restaurantId),
      );
      return res.sendStatus(200);
    } catch (error: unknown) {
      console.error('[MERCADO_PAGO_POINT_WEBHOOK_ERROR]', {
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      return res.sendStatus(500);
    }
  }
}

export default new MercadoPagoPointWebhookController();
