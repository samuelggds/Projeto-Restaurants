import { Request, Response } from 'express';
import { safeErrorName } from '../../../services/telemetrySanitizer.js';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';
import finalizeOrderCardPaymentService from '../services/FinalizeOrderCardPaymentService.js';
import { getMercadoPagoPaymentApi } from '../../payments/providers/mercadoPagoClient.js';
import orderRepository from '../repositories/OrderRepository.js';
import failPendingOrderPaymentService from '../services/FailPendingOrderPaymentService.js';
import { matchesOrderPaymentEvidence } from '../utils/paymentEvidence.js';

const APPROVED_STATUSES = new Set(['approved', 'accredited', 'paid']);
const TERMINAL_UNPAID_STATUSES = new Set(['cancelled', 'rejected', 'refunded', 'charged_back']);

export function parseMercadoPagoOrderReference(externalReference: string) {
  const match = /^order(pix|card):(\d+):(\d+)$/i.exec(String(externalReference || '').trim());
  if (!match) {
    return null;
  }

  const type = String(match[1] || '').toLowerCase() as 'pix' | 'card';
  const firstId = Number(match[2] || 0);
  const secondId = Number(match[3] || 0);

  // O Pix foi criado historicamente como orderpix:<restaurantId>:<orderId>,
  // enquanto o checkout de cartão usa ordercard:<orderId>:<restaurantId>.
  return {
    type,
    restaurantId: type === 'pix' ? firstId : secondId,
    orderId: type === 'pix' ? secondId : firstId,
  };
}

class MercadoPagoOrderWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const paymentId = req.body?.data?.id || req.body?.id || req.query?.id;
      const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
      const hintedRestaurantId = Number(req.query?.restaurantId || req.body?.restaurantId || 0);

      if (!paymentId) {
        return res.sendStatus(200);
      }

      if (
        (!Number.isInteger(hintedRestaurantId) || hintedRestaurantId <= 0) &&
        !allowGlobalFallback
      ) {
        return res.status(400).json({
          error: 'restaurantId obrigatorio no webhook Mercado Pago para ambiente multi-tenant.',
        });
      }

      const paymentApi = await getMercadoPagoPaymentApi(
        Number.isInteger(hintedRestaurantId) && hintedRestaurantId > 0
          ? hintedRestaurantId
          : undefined,
      );
      const response = (await paymentApi.get({
        id: String(paymentId),
      })) as unknown;
      const payment =
        typeof response === 'object' && response !== null
          ? ((response as { body?: unknown }).body ?? response)
          : {};

      const status = String((payment as { status?: unknown }).status || '').toLowerCase();
      const transactionAmount = (payment as { transaction_amount?: unknown }).transaction_amount;
      const currency = (payment as { currency_id?: unknown }).currency_id;
      const externalReference = String(
        (payment as { external_reference?: unknown }).external_reference || '',
      ).trim();
      const metadataRestaurantId = Number(
        (payment as { metadata?: { restaurant_id?: unknown } }).metadata?.restaurant_id || 0,
      );
      const resolvedRestaurantId =
        Number.isInteger(hintedRestaurantId) && hintedRestaurantId > 0
          ? hintedRestaurantId
          : Number.isInteger(metadataRestaurantId) && metadataRestaurantId > 0
            ? metadataRestaurantId
            : undefined;
      const parsedReference = parseMercadoPagoOrderReference(externalReference);
      const referenceType = parsedReference?.type || '';
      const referenceRestaurantId = parsedReference?.restaurantId || 0;
      const referenceOrderId = parsedReference?.orderId || 0;

      if (
        parsedReference &&
        ((hintedRestaurantId > 0 && referenceRestaurantId !== hintedRestaurantId) ||
          (metadataRestaurantId > 0 && referenceRestaurantId !== metadataRestaurantId))
      ) {
        return res.status(400).json({
          error: 'Webhook Mercado Pago rejeitado: restaurante da transação não confere.',
        });
      }

      if (TERMINAL_UNPAID_STATUSES.has(status)) {
        if (parsedReference) {
          await failPendingOrderPaymentService.execute({
            orderId: referenceOrderId,
            restaurantId: referenceRestaurantId,
          });
        } else {
          await failPendingOrderPaymentService.execute({
            restaurantId: resolvedRestaurantId,
            pixPaymentId: String(paymentId),
          });
        }
        return res.sendStatus(200);
      }

      if (!APPROVED_STATUSES.has(status)) {
        return res.sendStatus(200);
      }

      if (referenceType === 'card') {
        const orderId = referenceOrderId;
        const normalizedPaymentId = String(paymentId || '').trim();

        if (
          !Number.isInteger(orderId) ||
          orderId <= 0 ||
          !Number.isInteger(referenceRestaurantId) ||
          referenceRestaurantId <= 0
        ) {
          return res.status(400).json({
            error: 'Webhook Mercado Pago rejeitado: restaurante da transação não confere.',
          });
        }

        const order = await orderRepository.findById(orderId, referenceRestaurantId);
        if (!order) {
          return res.sendStatus(200);
        }
        if (
          String(order.paymentMethod || '').toUpperCase() !== 'CARTAO' ||
          !matchesOrderPaymentEvidence({
            expectedAmount: order.total,
            providerAmount: transactionAmount,
            providerCurrency: currency,
          })
        ) {
          return res.status(400).json({
            error: 'Webhook Mercado Pago rejeitado: dados financeiros da transação não conferem.',
          });
        }

        if (normalizedPaymentId) {
          await orderRepository.setCardCheckoutSessionId(
            orderId,
            referenceRestaurantId,
            `mp_pay:${normalizedPaymentId}`,
          );
        }

        await finalizeOrderCardPaymentService.execute({
          orderId,
          restaurantId: referenceRestaurantId,
          allowMissingOrder: true,
        });

        return res.sendStatus(200);
      }

      await finalizeOrderPixPaymentService.execute({
        orderId: referenceType === 'pix' ? referenceOrderId : undefined,
        paymentId: String(paymentId),
        restaurantId: referenceType === 'pix' ? referenceRestaurantId : resolvedRestaurantId,
        allowMissingOrder: true,
      });

      return res.sendStatus(200);
    } catch (error: unknown) {
      console.error('[ORDER_PIX_WEBHOOK_ERROR]', { errorType: safeErrorName(error) });

      return res.sendStatus(500);
    }
  }
}

export default new MercadoPagoOrderWebhookController();
