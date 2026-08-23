import { Request, Response } from 'express';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';
import finalizeOrderCardPaymentService from '../services/FinalizeOrderCardPaymentService.js';
import { getMercadoPagoPaymentApi } from '../../payments/providers/mercadoPagoClient.js';
import orderRepository from '../repositories/OrderRepository.js';
import failPendingOrderPaymentService from '../services/FailPendingOrderPaymentService.js';

const APPROVED_STATUSES = new Set(['approved', 'accredited', 'paid']);
const TERMINAL_UNPAID_STATUSES = new Set(['cancelled', 'rejected', 'refunded', 'charged_back']);

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
      const parsedReference = /^order(pix|card):(\d+):(\d+)$/i.exec(externalReference);
      const referenceType = String(parsedReference?.[1] || '').toLowerCase();
      const referenceRestaurantId = Number(parsedReference?.[2] || 0);
      const referenceOrderId = Number(parsedReference?.[3] || 0);

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
        restaurantId:
          referenceType === 'pix' ? referenceRestaurantId : resolvedRestaurantId,
        allowMissingOrder: true,
      });

      return res.sendStatus(200);
    } catch (error: unknown) {
      console.error(
        '[ORDER_PIX_WEBHOOK_ERROR]',
        error instanceof Error ? error.message : String(error),
      );

      return res.sendStatus(500);
    }
  }
}

export default new MercadoPagoOrderWebhookController();
