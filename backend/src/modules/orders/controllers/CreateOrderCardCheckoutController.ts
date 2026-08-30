import { Request, Response } from 'express';
import createOrderCardCheckoutService from '../services/CreateOrderCardCheckoutService.js';

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

      return res.status(201).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao iniciar pagamento com cartao',
      });
    }
  }
}

export default new CreateOrderCardCheckoutController();
