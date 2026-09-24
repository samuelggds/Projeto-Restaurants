import type { Request, Response } from 'express';
import createOrderService from '../services/CreateOrderService.js';
import openFinancePixPaymentService from '../services/OpenFinancePixPaymentService.js';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';
import { issueGuestOrderTrackingToken } from '../utils/guestOrderTrackingToken.js';
import { issueGuestOrderOwnershipToken } from '../utils/guestOrderOwnershipToken.js';
import { orderCreationContext } from '../services/orderCreationRequest.js';
import { OrderRequestError } from '../domain/OrderRequestError.js';
import { ActiveOnlinePaymentError } from '../domain/ActiveOnlinePaymentError.js';
import { PaymentCreationUncertainError } from '../services/PaymentCreationUncertainError.js';
import { recordWhatsappOrderNotificationOptIn } from '../../../services/whatsappOrderConsent.js';
import { safeErrorName } from '../../../services/telemetrySanitizer.js';

class CreateOrderOpenFinancePaymentController {
  async handle(req: Request, res: Response) {
    try {
      const {
        restaurantId,
        type,
        paymentMethod,
        payerInstitution,
        observation,
        tableId,
        settlementMode,
        items,
        address,
        number,
        district,
        city,
        state,
        zipCode,
        complement,
        customerName,
        customerCpf,
        customerPhone,
        whatsappOptIn,
        couponRedemptionId,
      } = req.body;

      if (String(paymentMethod || '').toUpperCase() !== 'PIX') {
        return res.status(400).json({ error: 'Open Finance está disponível somente para Pix.' });
      }

      const userId = req.user?.id ?? null;
      const userRestaurantId = req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null;
      const resolvedRestaurantId = resolveOrderRestaurantId({
        requestedRestaurantId: restaurantId,
        contextRestaurantId: userRestaurantId,
      });

      const order = await createOrderService.execute({
        creationRequest: orderCreationContext(req, 'open-finance-pix'),
        userId,
        restaurantId: resolvedRestaurantId,
        userRestaurantId,
        tableSessionId: req.tableSession?.id ?? null,
        tableSessionTableId: req.tableSession?.tableId ?? null,
        participantId: req.tableParticipant?.id ?? null,
        settlementMode,
        deferRealtimeUntilPaid: true,
        enforceSingleActiveOnlinePayment:
          String(req.user?.role || 'CLIENTE').toUpperCase() === 'CLIENTE',
        type,
        paymentMethod: 'PIX',
        paid: false,
        observation,
        tableId,
        customerName,
        customerCpf,
        customerPhone,
        couponRedemptionId,
        items,
        address,
        number,
        district,
        city,
        state,
        zipCode,
        complement,
      });

      if (whatsappOptIn === true && String(order.type || '').toUpperCase() !== 'MESA') {
        try {
          await recordWhatsappOrderNotificationOptIn({
            restaurantId: order.restaurantId,
            orderId: order.id,
            userId: order.userId,
            customerPhone,
          });
        } catch (consentError) {
          console.warn('[WHATSAPP_ORDER_OPT_IN_RECORD_FAILED]', {
            requestId: req.requestId,
            errorType: safeErrorName(consentError),
          });
        }
      }

      let result;
      try {
        result = await openFinancePixPaymentService.start({
          orderId: order.id,
          restaurantId: resolvedRestaurantId,
          payerInstitution,
          customerCpf,
        });
      } catch (error) {
        console.error('[OPEN_FINANCE_PAYMENT_CREATION_UNCERTAIN]', {
          orderId: order.id,
          restaurantId: resolvedRestaurantId,
          errorType: safeErrorName(error),
        });
        if (error instanceof Error && /banco válido|CPF válido|desativado|não está disponível/i.test(error.message)) {
          throw error;
        }
        throw new PaymentCreationUncertainError(order.id, order.publicId);
      }

      const isGuestOrder = req.user?.isGuest === true;
      const isGuestDelivery = isGuestOrder && String(order.type || '').toUpperCase() === 'DELIVERY';
      const guestTrackingToken = isGuestDelivery
        ? issueGuestOrderTrackingToken({
            orderId: Number(order.id),
            publicId: String(order.publicId),
          })
        : null;
      const guestOwnershipToken = isGuestOrder
        ? issueGuestOrderOwnershipToken({
            orderId: Number(order.id),
            publicId: String(order.publicId),
          })
        : null;

      return res.status(201).json({
        ...result,
        orderId: order.id,
        orderPublicId: order.publicId,
        ...(guestTrackingToken ? { guestTrackingToken } : {}),
        ...(guestOwnershipToken ? { guestOwnershipToken } : {}),
      });
    } catch (error: unknown) {
      if (error instanceof ActiveOnlinePaymentError) {
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
          orderId: error.orderId,
          orderPublicId: error.orderPublicId,
          paymentMethod: error.paymentMethod,
          orderType: error.orderType,
          expiresAt: error.expiresAt,
          requestId: req.requestId,
        });
      }
      if (error instanceof OrderRequestError) {
        return res
          .status(error.statusCode)
          .json({ error: error.message, code: error.code, requestId: req.requestId });
      }
      if (error instanceof PaymentCreationUncertainError) {
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
          orderId: error.orderId,
          orderPublicId: error.orderPublicId,
          reconciliationRequired: true,
          ...(req.user?.isGuest
            ? {
                guestOwnershipToken: issueGuestOrderOwnershipToken({
                  orderId: error.orderId,
                  publicId: error.orderPublicId,
                }),
                ...(String(req.body?.type).toUpperCase() === 'DELIVERY'
                  ? {
                      guestTrackingToken: issueGuestOrderTrackingToken({
                        orderId: error.orderId,
                        publicId: error.orderPublicId,
                      }),
                    }
                  : {}),
              }
            : {}),
        });
      }
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível iniciar o pagamento pelo app do banco.',
      });
    }
  }
}

export default new CreateOrderOpenFinancePaymentController();
