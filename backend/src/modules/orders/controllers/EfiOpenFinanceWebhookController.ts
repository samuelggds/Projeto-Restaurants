import type { Request, Response } from 'express';
import orderRepository from '../repositories/OrderRepository.js';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';
import { validEfiWebhookHmac } from '../../payments/providers/efiOpenFinance.js';
import { safeErrorName } from '../../../services/telemetrySanitizer.js';

class EfiOpenFinanceWebhookController {
  async handle(req: Request, res: Response) {
    if (!validEfiWebhookHmac(req.query.hmac)) {
      return res.status(401).json({ error: 'Webhook Efí não autorizado.' });
    }

    const identifier = String(req.body?.identificadorPagamento || '').trim();
    if (!identifier) return res.status(200).json({ received: true });

    const paymentId = `efi_open_finance:${identifier}`;
    const order = await orderRepository.findByPixPaymentId(paymentId);
    if (!order) return res.status(200).json({ received: true });

    const status = String(req.body?.status || '').trim().toLowerCase();
    if (status !== 'aceito') return res.status(200).json({ received: true });

    try {
      await finalizeOrderPixPaymentService.execute({
        orderId: order.id,
        restaurantId: order.restaurantId,
        paymentId,
        providerTimeoutMs: 12_000,
      });
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('[EFI_OPEN_FINANCE_WEBHOOK_RECONCILE_FAILED]', {
        orderId: order.id,
        restaurantId: order.restaurantId,
        errorType: safeErrorName(error),
      });
      return res.status(503).json({ error: 'Falha temporária ao reconciliar pagamento.' });
    }
  }
}

export default new EfiOpenFinanceWebhookController();
