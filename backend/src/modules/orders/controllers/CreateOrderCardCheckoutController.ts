import { Request, Response } from 'express';
import createOrderCardCheckoutService from '../services/CreateOrderCardCheckoutService.js';
import { issueGuestOrderTrackingToken } from '../utils/guestOrderTrackingToken.js';
import { issueGuestOrderOwnershipToken } from '../utils/guestOrderOwnershipToken.js';
import { PaymentCreationUncertainError } from '../services/PaymentCreationUncertainError.js';
import { orderCreationContext } from '../services/orderCreationRequest.js';
import { OrderRequestError } from '../domain/OrderRequestError.js';
import { recordWhatsappOrderNotificationOptIn } from '../../../services/whatsappOrderConsent.js';
import { notifyCustomerPaymentConfirmed } from '../../../services/customerNotifier.js';
import { safeErrorName } from '../../../services/telemetrySanitizer.js';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';
import orderRepository from '../repositories/OrderRepository.js';
import { ActiveOnlinePaymentError } from '../domain/ActiveOnlinePaymentError.js';

async function recordUncertainCheckoutWhatsappOptIn(
  req: Request,
  orderId: number | string,
) {
  if (req.body?.whatsappOptIn !== true || String(req.body?.type || '').toUpperCase() === 'MESA') {
    return;
  }

  try {
    const resolvedRestaurantId = resolveOrderRestaurantId({
      requestedRestaurantId: req.body?.restaurantId,
      contextRestaurantId: req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null,
    });
    await recordWhatsappOrderNotificationOptIn({
      restaurantId: resolvedRestaurantId,
      orderId,
      userId: req.user?.id ?? null,
      customerPhone: req.body?.customerPhone,
    });
  } catch (consentError) {
    console.warn('[WHATSAPP_ORDER_OPT_IN_RECORD_FAILED]', {
      requestId: req.requestId,
      errorType: safeErrorName(consentError),
    });
  }
}

class CreateOrderCardCheckoutController {
  async handle(req: Request, res: Response) {
    try {
      const {
        restaurantId,
        type,
        paymentMethod,
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
        observation,
        tableId,
        settlementMode,
        cardProvider,
        successUrl,
        cancelUrl,
        couponRedemptionId,
        paymentMethodId,
        cardToken,
        cardPaymentMethodId,
        encryptedCard,
        cardData,
        holderName,
        holderTaxId,
        expMonth,
        expYear,
        billingPostalCode,
        billingAddressNumber,
      } = req.body;

      const userId = req.user?.id ?? null;
      const userRestaurantId = req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null;
      const resolvedRestaurantId = resolveOrderRestaurantId({
        requestedRestaurantId: restaurantId,
        contextRestaurantId: userRestaurantId,
      });

      const result = await createOrderCardCheckoutService.execute({
        creationRequest: orderCreationContext(req, 'card'),
        userId,
        restaurantId: resolvedRestaurantId,
        userRestaurantId,
        tableSessionId: req.tableSession?.id ?? null,
        tableSessionTableId: req.tableSession?.tableId ?? null,
        participantId: req.tableParticipant?.id ?? null,
        settlementMode,
        type,
        paymentMethod,
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
        observation,
        tableId,
        cardProvider,
        successUrl,
        cancelUrl,
        couponRedemptionId,
        paymentMethodId,
        cardToken,
        cardPaymentMethodId,
        encryptedCard,
        cardData,
        holderName,
        holderTaxId,
        expMonth,
        expYear,
        billingPostalCode,
        billingAddressNumber,
        customerIp: req.ip,
        enforceSingleActiveOnlinePayment:
          String(req.user?.role || 'CLIENTE').toUpperCase() === 'CLIENTE',
      });

      if (whatsappOptIn === true && String(type || '').toUpperCase() !== 'MESA') {
        try {
          const consentRecorded = await recordWhatsappOrderNotificationOptIn({
            restaurantId: resolvedRestaurantId,
            orderId: result.orderId,
            userId,
            customerPhone,
          });

          if (consentRecorded && result.paid === true) {
            const paidOrder = await orderRepository.findById(result.orderId, resolvedRestaurantId);
            if (paidOrder) {
              void notifyCustomerPaymentConfirmed({
                restaurantId: paidOrder.restaurantId,
                customerPhone,
                customerName: paidOrder.user?.name || customerName,
                restaurantName: paidOrder.restaurant?.name,
                restaurantWhatsapp: paidOrder.restaurant?.whatsapp,
                orderId: paidOrder.id,
                total: paidOrder.total,
                paymentMethod: paidOrder.paymentMethod,
              }).catch((notificationError: unknown) => {
                console.error(
                  '[CUSTOMER_NOTIFICATION_UNHANDLED]',
                  notificationError instanceof Error
                    ? notificationError.message
                    : String(notificationError),
                );
              });
            }
          }
        } catch (consentError) {
          console.warn('[WHATSAPP_ORDER_OPT_IN_RECORD_FAILED]', {
            requestId: req.requestId,
            errorType: safeErrorName(consentError),
          });
        }
      }

      const isGuestOrder = req.user?.isGuest === true;
      const isGuestDelivery = isGuestOrder && String(type || '').toUpperCase() === 'DELIVERY';
      const guestTrackingToken = isGuestDelivery
        ? issueGuestOrderTrackingToken({
            orderId: Number(result.orderId),
            publicId: String(result.orderPublicId),
          })
        : null;
      const guestOwnershipToken = isGuestOrder
        ? issueGuestOrderOwnershipToken({
            orderId: Number(result.orderId),
            publicId: String(result.orderPublicId),
          })
        : null;

      return res.status(201).json({
        ...result,
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
        await recordUncertainCheckoutWhatsappOptIn(req, error.orderId);
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
        error: error instanceof Error ? error.message : 'Erro ao iniciar pagamento com cartao',
      });
    }
  }
}

export default new CreateOrderCardCheckoutController();
