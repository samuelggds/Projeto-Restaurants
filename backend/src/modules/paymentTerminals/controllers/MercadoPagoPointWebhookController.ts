import type { Request, Response } from 'express';
import paymentTerminalRepository from '../repositories/PaymentTerminalRepository.js';
import paymentTerminalService from '../services/PaymentTerminalService.js';

class MercadoPagoPointWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const providerOrderId = String(req.body?.data?.id || req.body?.id || '').trim();
      if (!providerOrderId) return res.sendStatus(200);

      const localPayment = await paymentTerminalRepository.findByProviderOrderId(
        'MERCADO_PAGO',
        providerOrderId,
      );
      if (!localPayment) return res.sendStatus(200);

      await paymentTerminalService.reconcilePointOrder(
        providerOrderId,
        Number(localPayment.restaurantId),
      );
      return res.sendStatus(200);
    } catch (error: unknown) {
      console.error(
        '[MERCADO_PAGO_POINT_WEBHOOK_ERROR]',
        error instanceof Error ? error.message : String(error),
      );
      return res.sendStatus(500);
    }
  }
}

export default new MercadoPagoPointWebhookController();
