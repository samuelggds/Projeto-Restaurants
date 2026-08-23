import { Request, Response } from 'express';
import orderPixPaymentService from '../services/OrderPixPaymentService.js';
import createOrderService from '../services/CreateOrderService.js';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';

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
        // The external charge already exists. Keep the order and return the QR;
        // provider webhooks use orderId in their reference and can reconcile it.
        console.error(
          '[PIX_ORDER_PAYMENT_LINK_ERROR]',
          error instanceof Error ? error.message : String(error),
          { orderId: order.id, restaurantId: resolvedRestaurantId },
        );
      }

      return res.status(201).json({
        ...result,
        orderId: order.id,
      });
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao gerar pagamento PIX',
      });
    }
  }
}

export default new CreateOrderPixPaymentController();
