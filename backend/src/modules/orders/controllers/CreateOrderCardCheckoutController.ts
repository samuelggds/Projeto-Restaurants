import { Request, Response } from 'express';
import createOrderCardCheckoutService from '../services/CreateOrderCardCheckoutService.js';
import { issueGuestOrderTrackingToken } from '../utils/guestOrderTrackingToken.js';
import { issueGuestOrderOwnershipToken } from '../utils/guestOrderOwnershipToken.js';

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

      const isGuestDelivery =
        req.user?.isGuest === true && String(type || '').toUpperCase() === 'DELIVERY';
      const guestTrackingToken = isGuestDelivery
        ? issueGuestOrderTrackingToken({
            orderId: Number(result.orderId),
            publicId: String(result.orderPublicId),
          })
        : null;
      const guestOwnershipToken = isGuestDelivery
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
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao iniciar pagamento com cartao',
      });
    }
  }
}

export default new CreateOrderCardCheckoutController();
