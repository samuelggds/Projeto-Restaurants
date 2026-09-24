import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import orderRepository from '../repositories/OrderRepository.js';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';
import { isUuid } from '../../payments/providers/belvoOpenFinance.js';
import { safeErrorName } from '../../../services/telemetrySanitizer.js';

function secureEquals(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function webhookAuthorized(req: Request) {
  const expected = String(process.env.BELVO_WEBHOOK_TOKEN || '').trim();
  if (!expected) return process.env.NODE_ENV !== 'production' ? false : false;
  const raw = String(req.headers.authorization || '').trim();
  const received = raw.replace(/^Bearer\s+/iu, '').trim();
  return Boolean(received && secureEquals(received, expected));
}

function paymentIntentEvent(body: unknown) {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;
  const webhookType = String(data.webhook_type || '').trim().toUpperCase();
  const webhookCode = String(data.webhook_code || '').trim().toUpperCase();

  // Payment Intents use the Belvo Payments webhook V1 schema.
  if (webhookType !== 'PAYMENT_INTENTS' || webhookCode !== 'STATUS_UPDATE') return null;

  const intentId = String(data.object_id || '').trim();
  if (!isUuid(intentId)) return null;

  const eventData =
    data.data && typeof data.data === 'object' ? (data.data as Record<string, unknown>) : {};
  const status = String(eventData.status || '').trim().toUpperCase();

  return { intentId, status };
}

class BelvoOrderWebhookController {
  async handle(req: Request, res: Response) {
    if (!webhookAuthorized(req)) {
      return res.status(401).json({ error: 'Webhook não autorizado.' });
    }

    const event = paymentIntentEvent(req.body);
    if (!event) {
      return res.status(200).json({ received: true });
    }

    if (event.status !== 'SUCCEEDED') {
      return res.status(200).json({ received: true });
    }

    const paymentId = `belvo:${event.intentId}`;
    const order = await orderRepository.findByPixPaymentId(paymentId);
    if (!order) {
      return res.status(200).json({ received: true });
    }

    try {
      await finalizeOrderPixPaymentService.execute({
        orderId: order.id,
        restaurantId: order.restaurantId,
        paymentId,
        providerTimeoutMs: 3_500,
      });
      return res.status(200).json({ received: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (/ainda não foi aprovado|não foi aprovado/iu.test(message)) {
        return res.status(200).json({ received: true });
      }

      console.error('[BELVO_WEBHOOK_RECONCILIATION_FAILED]', {
        orderId: order.id,
        restaurantId: order.restaurantId,
        errorType: safeErrorName(error),
      });
      return res.status(503).json({ error: 'Conciliação temporariamente indisponível.' });
    }
  }
}

export default new BelvoOrderWebhookController();
