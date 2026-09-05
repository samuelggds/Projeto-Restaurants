import { Request, Response } from 'express';
import createOrderService from '../services/CreateOrderService.js';
import { issueGuestOrderTrackingToken } from '../utils/guestOrderTrackingToken.js';

class CreateOrderController {
  async handle(req: Request, res: Response) {
    try {
      const {
        restaurantId,
        type,
        paymentMethod,
        payOnDelivery,
        payOnDeliveryMethod,
        observation,
        customerName,
        customerCpf,
        customerPhone,
        tableId,
        settlementMode,
        couponRedemptionId,
        items,
        address,
        number,
        district,
        city,
        state,
        zipCode,
        complement,
      } = req.body;

      const userId = req.user?.id ?? null;
      const userRestaurantId = req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null;

      if (
        payOnDelivery === true &&
        String(payOnDeliveryMethod || paymentMethod || '').toUpperCase() === 'DINHEIRO' &&
        String(req.user?.role || '').toUpperCase() !== 'ADMIN'
      ) {
        throw new Error('Pagamento em dinheiro é registrado somente pelo administrador.');
      }

      const order = await createOrderService.execute({
        userId,
        restaurantId,
        userRestaurantId,
        tableSessionId: req.tableSession?.id ?? null,
        tableSessionTableId: req.tableSession?.tableId ?? null,
        participantId: req.tableParticipant?.id ?? null,
        settlementMode,
        type,
        paymentMethod,
        payOnDelivery,
        payOnDeliveryMethod,
        observation,
        customerName,
        customerCpf,
        customerPhone,
        tableId,
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

      const isGuestDelivery =
        req.user?.isGuest === true && String(order.type || '').toUpperCase() === 'DELIVERY';
      const guestTrackingToken = isGuestDelivery
        ? issueGuestOrderTrackingToken({
            orderId: Number(order.id),
            publicId: String(order.publicId),
          })
        : null;

      return res.status(201).json({
        ...order,
        ...(guestTrackingToken ? { guestTrackingToken } : {}),
      });
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao criar pedido',
      });
    }
  }
}

export default new CreateOrderController();
