import { Request, Response } from 'express';
import prisma from '../../../config/prisma.js';
import { safeErrorName } from '../../../services/telemetrySanitizer.js';
import {
  getRestaurantPagarmeCredentials,
  pagarmeJson,
} from '../../payments/providers/pagarmeV5.js';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';
import finalizeOrderCardPaymentService from '../services/FinalizeOrderCardPaymentService.js';
import failPendingOrderPaymentService from '../services/FailPendingOrderPaymentService.js';
import { matchesOrderPaymentEvidence } from '../utils/paymentEvidence.js';

type PagarmeCharge = {
  id?: string;
  amount?: number;
  paid_amount?: number;
  status?: string;
  currency?: string;
  payment_method?: string;
  order?: {
    code?: string;
    metadata?: Record<string, unknown>;
  };
  last_transaction?: {
    status?: string;
    amount?: number;
  };
};

const SUCCESS = new Set(['paid', 'captured']);
const TERMINAL_UNPAID = new Set([
  'failed',
  'canceled',
  'cancelled',
  'chargedback',
  'not_authorized',
  'voided',
  'with_error',
]);

function resourceChargeId(req: Request) {
  const type = String(req.body?.type || '').trim().toLowerCase();
  if (type && !type.startsWith('charge.') && !type.startsWith('order.')) return '';
  return String(req.body?.data?.id || req.body?.charge?.id || req.body?.id || '').trim();
}

async function localOrderForCharge(chargeId: string) {
  return prisma.order.findFirst({
    where: {
      OR: [
        { pixPaymentId: `pagarme:${chargeId}` },
        { cardCheckoutSessionId: `pagarme_charge:${chargeId}` },
      ],
    },
    select: {
      id: true,
      publicId: true,
      restaurantId: true,
      total: true,
      paymentMethod: true,
      paid: true,
      pixPaymentId: true,
      cardCheckoutSessionId: true,
    },
  });
}

class PagarmeOrderWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const chargeId = resourceChargeId(req);
      if (!chargeId) return res.sendStatus(200);

      const order = await localOrderForCharge(chargeId);
      if (!order) return res.sendStatus(200);

      const { secretKey } = await getRestaurantPagarmeCredentials(order.restaurantId);
      const remote = await pagarmeJson<PagarmeCharge>(
        secretKey,
        `/charges/${encodeURIComponent(chargeId)}`,
        { method: 'GET', signal: AbortSignal.timeout(10_000) },
      );
      if (!remote.response.ok || String(remote.body?.id || '').trim() !== chargeId) {
        return res.sendStatus(502);
      }

      const metadata = remote.body?.order?.metadata || {};
      const metadataRestaurantId = Number(metadata.restaurant_id || 0);
      const metadataOrderId = Number(metadata.order_id || 0);
      const orderCode = String(remote.body?.order?.code || '').trim();
      const expectedPixReference = `orderpix:${order.restaurantId}:${order.id}`;
      const isPix = order.pixPaymentId === `pagarme:${chargeId}`;
      const isCard = order.cardCheckoutSessionId === `pagarme_charge:${chargeId}`;

      if (
        (metadataRestaurantId && metadataRestaurantId !== order.restaurantId) ||
        (metadataOrderId && metadataOrderId !== order.id) ||
        (isPix && orderCode !== expectedPixReference)
      ) {
        return res.status(400).json({ error: 'Webhook Pagar.me rejeitado: vínculo do pedido não confere.' });
      }

      const status = String(
        remote.body?.last_transaction?.status || remote.body?.status || '',
      )
        .trim()
        .toLowerCase();
      const paymentMethod = String(remote.body?.payment_method || '').trim().toLowerCase();
      const providerAmount =
        Number(remote.body?.paid_amount || 0) > 0
          ? Number(remote.body?.paid_amount)
          : Number(remote.body?.amount);

      if ((isPix && paymentMethod !== 'pix') || (isCard && paymentMethod !== 'credit_card')) {
        return res.status(400).json({
          error: 'Webhook Pagar.me rejeitado: meio de pagamento não confere.',
        });
      }

      if (TERMINAL_UNPAID.has(status)) {
        await failPendingOrderPaymentService.execute({
          orderId: order.id,
          restaurantId: order.restaurantId,
        });
        return res.sendStatus(200);
      }

      if (!SUCCESS.has(status)) return res.sendStatus(200);

      if (
        !matchesOrderPaymentEvidence({
          expectedAmount: order.total,
          providerAmount: Number(providerAmount) / 100,
          providerCurrency: remote.body?.currency || 'BRL',
        })
      ) {
        return res.status(400).json({ error: 'Webhook Pagar.me rejeitado: valor não confere.' });
      }

      if (isPix) {
        await finalizeOrderPixPaymentService.execute({
          orderId: order.id,
          paymentId: `pagarme:${chargeId}`,
          restaurantId: order.restaurantId,
          allowMissingOrder: true,
        });
        return res.sendStatus(200);
      }

      if (isCard) {
        await finalizeOrderCardPaymentService.execute({
          orderId: order.id,
          checkoutSessionId: `pagarme_charge:${chargeId}`,
          restaurantId: order.restaurantId,
          allowMissingOrder: true,
        });
      }

      return res.sendStatus(200);
    } catch (error) {
      console.error('[PAGARME_ORDER_WEBHOOK_ERROR]', { errorType: safeErrorName(error) });
      return res.sendStatus(500);
    }
  }
}

export default new PagarmeOrderWebhookController();
