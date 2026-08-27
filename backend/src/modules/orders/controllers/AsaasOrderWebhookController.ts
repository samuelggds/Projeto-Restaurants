import { Request, Response } from 'express';
import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import orderRepository from '../repositories/OrderRepository.js';
import { markCouponRedemptionUsedForOrder } from '../services/couponRedemptionLifecycle.js';
import {
  emitTableSessionOrderEvent,
  emitWaiterTableOrderEvent,
} from '../utils/waiterOrderRealtime.js';
import failPendingOrderPaymentService from '../services/FailPendingOrderPaymentService.js';
import reconcileLateCancelledPaymentService from '../services/ReconcileLateCancelledPaymentService.js';

const TERMINAL_UNPAID_EVENTS = new Set(['PAYMENT_CANCELED', 'PAYMENT_DELETED', 'PAYMENT_REFUNDED']);

export interface AsaasWebhookPaymentPayload {
  id: string;
  externalReference: string;
  value: number;
  walletId: string;
}

export interface AsaasWebhookPayload {
  event: string;
  payment: AsaasWebhookPaymentPayload;
}

class AsaasOrderWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const tokenFromHeader = String(req.header('asaas-access-token') || '').trim();
      const expectedToken = String(process.env.ASAAS_WEBHOOK_TOKEN || '').trim();

      if (!expectedToken || tokenFromHeader !== expectedToken) {
        return res.status(401).json({ error: 'Token de webhook invalido.' });
      }

      const payload = req.body as AsaasWebhookPayload;
      const event = String(payload?.event || '')
        .trim()
        .toUpperCase();

      const isPaymentReceived = event === 'PAYMENT_RECEIVED';
      const isTerminalUnpaidEvent = TERMINAL_UNPAID_EVENTS.has(event);
      if (!isPaymentReceived && !isTerminalUnpaidEvent) {
        return res.status(200).json({ received: true, ignored: true });
      }

      const payment = payload?.payment;
      const externalReference = String(payment?.externalReference || '').trim();
      const asaasPaymentId = String(payment?.id || '').trim();
      const paymentValue = Number(payment?.value);
      const walletId = String(payment?.walletId || '').trim();

      const hasRequiredPaymentFields =
        Boolean(asaasPaymentId) &&
        Boolean(externalReference) &&
        (isTerminalUnpaidEvent ||
          (Number.isFinite(paymentValue) && paymentValue >= 0 && Boolean(walletId)));

      if (!hasRequiredPaymentFields) {
        return res.status(200).json({ received: true, ignored: true });
      }

      const pixReference = /^orderpix:(\d+):(\d+)$/i.exec(externalReference);
      const referencedRestaurantId = pixReference ? Number(pixReference[1]) : null;
      const orderId = Number(pixReference?.[2] || externalReference);
      if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(200).json({ received: true, ignored: true });
      }

      const order = await prisma.order.findUnique({
        where: {
          id: orderId,
        },
        select: {
          id: true,
          restaurantId: true,
          userId: true,
          paid: true,
          status: true,
          paymentMethod: true,
          pixPaymentId: true,
          total: true,
        },
      });

      if (!order) {
        return res.status(200).json({ received: true, ignored: true });
      }

      if (referencedRestaurantId && referencedRestaurantId !== order.restaurantId) {
        return res.status(200).json({ received: true, ignored: true });
      }

      if (isTerminalUnpaidEvent) {
        await failPendingOrderPaymentService.execute({
          orderId: order.id,
          restaurantId: order.restaurantId,
        });
        return res.status(200).json({ received: true, processed: true });
      }

      if (Math.abs(paymentValue - Number(order.total)) > 0.009) {
        return res.status(200).json({ received: true, ignored: true });
      }

      const normalizedPaymentMethod = String(order.paymentMethod || '')
        .trim()
        .toUpperCase();

      const isSupportedAutomaticMethod =
        normalizedPaymentMethod === 'PIX' || normalizedPaymentMethod === 'CARTAO';

      if (!isSupportedAutomaticMethod) {
        return res.status(200).json({ received: true, ignored: true });
      }

      if (String(order.status) === 'CANCELADO' && order.paid !== true) {
        await reconcileLateCancelledPaymentService.execute({
          orderId: order.id,
          restaurantId: order.restaurantId,
          paymentMethod: normalizedPaymentMethod,
          paymentReference:
            normalizedPaymentMethod === 'PIX'
              ? `asaas:${asaasPaymentId}`
              : `asaas_pay:${asaasPaymentId}`,
        });
        return res.status(200).json({ received: true, processed: true, refunded: true });
      }

      if (walletId) {
        try {
          await prisma.restaurantSettings.updateMany({
            where: {
              restaurantId: order.restaurantId,
              OR: [{ gatewayMerchantId: null }, { gatewayMerchantId: '' }],
            },
            data: {
              gatewayMerchantId: walletId,
            },
          });
        } catch (settingsUpdateError: unknown) {
          console.warn(
            '[ASAAS_WEBHOOK_GATEWAY_ID_BACKFILL_ERROR]',
            settingsUpdateError instanceof Error
              ? settingsUpdateError.message
              : String(settingsUpdateError),
          );
        }
      }

      if (!order.paid) {
        if (
          normalizedPaymentMethod === 'PIX' &&
          asaasPaymentId &&
          !String(order.pixPaymentId || '').trim()
        ) {
          await prisma.order.update({
            where: {
              id: order.id,
            },
            data: {
              pixPaymentId: `asaas:${asaasPaymentId}`,
            },
          });
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
          const confirmedOrder = await orderRepository.confirmPayment(
            order.id,
            order.restaurantId,
            tx,
          );
          await markCouponRedemptionUsedForOrder(order.id, order.restaurantId, tx);
          return confirmedOrder;
        });

        io.to(`restaurant:${updatedOrder.restaurantId}`).emit('order:payment-confirmed', {
          orderId: updatedOrder.id,
          paid: true,
          paymentMethod: updatedOrder.paymentMethod,
        });
        emitTableSessionOrderEvent(io, 'order:payment-confirmed', updatedOrder);

        io.to(`restaurant:${updatedOrder.restaurantId}`).emit('new-order', updatedOrder);
        emitWaiterTableOrderEvent(io, 'new-order', updatedOrder);
        emitTableSessionOrderEvent(io, 'new-order', updatedOrder);

        io.to(`restaurant:${updatedOrder.restaurantId}`).emit('order:status-changed', updatedOrder);
        emitTableSessionOrderEvent(io, 'order:status-changed', updatedOrder);

        io.to(`restaurant:${updatedOrder.restaurantId}:kitchen`).emit('kitchen:order-paid', {
          orderId: updatedOrder.id,
          restaurantId: updatedOrder.restaurantId,
          paid: true,
        });

        if (updatedOrder.userId) {
          io.to(`user:${updatedOrder.userId}`).emit('payment-confirmed', {
            orderId: updatedOrder.id,
            paid: true,
            paymentMethod: updatedOrder.paymentMethod,
            status: updatedOrder.status,
          });
        }
      }

      return res.status(200).json({ received: true, processed: true });
    } catch (error: unknown) {
      console.error(
        '[ASAAS_WEBHOOK_ERROR]',
        error instanceof Error ? error.message : String(error),
      );

      return res.status(500).json({ received: true, processed: false });
    }
  }
}

export default new AsaasOrderWebhookController();
