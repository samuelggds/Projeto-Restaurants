import { Request, Response } from 'express';
import createOrderCardCheckoutService from '../services/CreateOrderCardCheckoutService.js';
import { issueGuestOrderTrackingToken } from '../utils/guestOrderTrackingToken.js';
import { issueGuestOrderOwnershipToken } from '../utils/guestOrderOwnershipToken.js';
import { PaymentCreationUncertainError } from '../services/PaymentCreationUncertainError.js';
import { orderCreationContext } from '../services/orderCreationRequest.js';
import { OrderRequestError } from '../domain/OrderRequestError.js';

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
        observation,
        tableId,
        settlementMode,
        cardProvider,
        successUrl,
        cancelUrl,
        couponRedemptionId,
        paymentMethodId,
      } = req.body;

      const userId = req.user?.id ?? null;
      const userRestaurantId = req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null;

      const result = await createOrderCardCheckoutService.execute({
        creationRequest: orderCreationContext(req, 'card'),
        userId,
        restaurantId,
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
        customerIp: req.ip,
      });

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
        error: error instanceof Error ? error.message : 'Erro ao iniciar pagamento com cartao',
      });
    }
  }
}

export default new CreateOrderCardCheckoutController();
