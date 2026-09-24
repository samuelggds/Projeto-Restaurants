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

function intentIdFromBody(body: unknown) {
  if (!body || typeof body !== 'object') return '';
  const data = body as Record<string, unknown>;
  const nested =
    data.data && typeof data.data === 'object' ? (data.data as Record<string, unknown>) : {};
  for (const candidate of [
    nested.id,
    nested.payment_intent_id,
    data.payment_intent_id,
    data.object_id,
    data.id,
    data.resource_id,
  ]) {
    const value = String(candidate || '').trim();
    if (isUuid(value)) return value;
  }
  return '';
}

class BelvoOrderWebhookController {
  async handle(req: Request, res: Response) {
    if (!webhookAuthorized(req)) {
      return res.status(401).json({ error: 'Webhook não autorizado.' });
    }

    const intentId = intentIdFromBody(req.body);
    if (!intentId) {
      return res.status(200).json({ received: true });
    }

    const paymentId = `belvo:${intentId}`;
    const order = await orderRepository.findByPixPaymentId(paymentId);
    if (!order) {
      return res.status(200).json({ received: true });
    }

    try {
      await finalizeOrderPixPaymentService.execute({
        orderId: order.id,
        restaurantId: order.restaurantId,
        paymentId,
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
