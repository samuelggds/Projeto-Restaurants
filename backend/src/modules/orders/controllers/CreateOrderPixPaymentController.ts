import { Request, Response } from 'express';
import orderPixPaymentService from '../services/OrderPixPaymentService.js';
import createOrderService from '../services/CreateOrderService.js';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';
import { issueGuestOrderTrackingToken } from '../utils/guestOrderTrackingToken.js';
import { issueGuestOrderOwnershipToken } from '../utils/guestOrderOwnershipToken.js';

class CreateOrderPixPaymentController {
  async handle(req: Request, res: Response) {
    try {
      const {
        restaurantId,
        type,
        paymentMethod,
        pixProvider,
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
        couponRedemptionId,
      } = req.body;

      const userId = req.user?.id ?? null;
      const userRestaurantId = req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null;
      const resolvedRestaurantId = resolveOrderRestaurantId({
        requestedRestaurantId: restaurantId,
        contextRestaurantId: userRestaurantId,
      });
      const order = await createOrderService.execute({
        userId,
        restaurantId: resolvedRestaurantId,
        userRestaurantId,
        tableSessionId: req.tableSession?.id ?? null,
        tableSessionTableId: req.tableSession?.tableId ?? null,
        participantId: req.tableParticipant?.id ?? null,
        settlementMode,
        deferRealtimeUntilPaid: true,
        type,
        paymentMethod,
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

      let result;
      try {
        result = await orderPixPaymentService.createPixPayment({
          restaurantId: resolvedRestaurantId,
          type,
          paymentMethod,
          pixProvider,
          items,
          address,
          number,
          district,
          city,
          state,
          customerName,
          customerCpf,
          customerPhone,
          userEmail: req.user?.email || null,
          orderId: order.id,
          orderTotal: Number(order.total),
          orderSubtotal: Number(order.itemsSubtotal) - Number(order.couponDiscount),
          orderDeliveryFee: Number(order.deliveryFeeAmount),
        });
      } catch (error) {
        await orderPixPaymentService.removePendingOrderAfterPaymentFailure({
          orderId: order.id,
          restaurantId: resolvedRestaurantId,
        });
        throw error;
      }

      try {
        await orderPixPaymentService.attachPaymentToOrder({
          orderId: order.id,
          restaurantId: resolvedRestaurantId,
          paymentId: String(result.paymentId || ''),
        });
      } catch (error: unknown) {
        console.error(
          '[PIX_ORDER_PAYMENT_LINK_ERROR]',
          error instanceof Error ? error.message : String(error),
          { orderId: order.id, restaurantId: resolvedRestaurantId },
        );
      }

      const isGuestDelivery =
        req.user?.isGuest === true && String(order.type || '').toUpperCase() === 'DELIVERY';
      const guestTrackingToken = isGuestDelivery
        ? issueGuestOrderTrackingToken({
            orderId: Number(order.id),
            publicId: String(order.publicId),
          })
        : null;
      const guestOwnershipToken = isGuestDelivery
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
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao gerar pagamento PIX',
      });
    }
  }
}

export default new CreateOrderPixPaymentController();
