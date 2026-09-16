import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { OrderRequestError } from '../domain/OrderRequestError.js';
import { orderCreationContext } from '../services/orderCreationRequest.js';
import { safeErrorName } from '../../../services/telemetrySanitizer.js';
import createOrderService from '../services/CreateOrderService.js';
import { issueGuestOrderTrackingToken } from '../utils/guestOrderTrackingToken.js';
import { issueGuestOrderOwnershipToken } from '../utils/guestOrderOwnershipToken.js';
import { withoutOrderCreationMetadata } from '../utils/orderPublicData.js';
import { resolveCustomerOrderLinks } from '../../../services/customerOrderMessaging.js';
import { recordWhatsappOrderNotificationOptIn } from '../../../services/whatsappOrderConsent.js';

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
        whatsappOptIn,
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
        throw new OrderRequestError('Pagamento em dinheiro é registrado somente pelo administrador.');
      }

      const order = await createOrderService.execute({
        creationRequest: orderCreationContext(req),
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

      if (whatsappOptIn === true && String(order.type || '').toUpperCase() !== 'MESA') {
        try {
          await recordWhatsappOrderNotificationOptIn({
            restaurantId: order.restaurantId,
            orderId: order.id,
            userId: order.userId,
            customerPhone,
          });
        } catch (consentError) {
          // Falhar ao registrar a evidência nunca amplia permissão: o pedido continua
          // válido, porém o notifier não encontrará opt-in e não enviará WhatsApp.
          console.warn('[WHATSAPP_ORDER_OPT_IN_RECORD_FAILED]', {
            requestId: req.requestId,
            errorType: safeErrorName(consentError),
          });
        }
      }

      const isGuestOrder = req.user?.isGuest === true;
      const isDelivery = String(order.type || '').toUpperCase() === 'DELIVERY';
      const isGuestDelivery = isGuestOrder && isDelivery;
      const isAdminManualDelivery =
        isDelivery && String(req.user?.role || '').toUpperCase() === 'ADMIN' && Boolean(order.publicId);
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
      const customerAccess = isAdminManualDelivery
        ? await resolveCustomerOrderLinks({
            restaurantId: order.restaurantId,
            orderId: order.id,
            publicId: order.publicId,
          })
        : undefined;

      return res.status(201).json({
        ...withoutOrderCreationMetadata(order),
        ...(guestTrackingToken ? { guestTrackingToken } : {}),
        ...(guestOwnershipToken ? { guestOwnershipToken } : {}),
        ...(customerAccess ? { customerAccess } : {}),
      });
    } catch (error: unknown) {
      if (error instanceof OrderRequestError) {
        return res.status(error.statusCode).json({ error: error.message, code: error.code, requestId: req.requestId });
      }
      if (error instanceof ZodError) return res.status(400).json({ error: error.issues[0]?.message || 'Dados do pedido inválidos.', requestId: req.requestId });
      console.error('[ORDER_CREATION_FAILED]', { requestId: req.requestId, errorType: safeErrorName(error) });
      return res.status(500).json({ error: 'Não foi possível criar o pedido. Tente novamente.', requestId: req.requestId });
    }
  }
}

export default new CreateOrderController();
