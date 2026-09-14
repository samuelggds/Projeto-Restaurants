import createOrderService from './CreateOrderService.js';
import orderRepository from '../repositories/OrderRepository.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { assertRestaurantIsOpenForOrders } from '../utils/restaurantAvailability.js';
import {
  type CardProvider,
  normalizeCardProvider,
} from '../../payments/providers/providerCatalog.js';
import {
  getCardCheckoutProviderHandler,
  type CardCheckoutResult,
  type CreateOrderCardCheckoutPayload,
} from './cardCheckoutProviders.js';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';
import { PaymentCreationUncertainError } from './PaymentCreationUncertainError.js';
import finalizeOrderCardPaymentService from './FinalizeOrderCardPaymentService.js';
import { replayCreatedOrder } from './orderCreationRequest.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';

class CreateOrderCardCheckoutService {
  async resolveCardProvider(payload: CreateOrderCardCheckoutPayload) {
    const resolvedRestaurantId = resolveOrderRestaurantId({
      requestedRestaurantId: payload.restaurantId,
      contextRestaurantId: payload.userRestaurantId,
    });

    const settings = await restaurantSettingsRepository.findByRestaurantId(resolvedRestaurantId);

    assertRestaurantIsOpenForOrders(settings?.isOpenForOrders, settings?.businessHours);

    if (settings?.acceptsCard === false) {
      throw new Error('O restaurante não está aceitando pagamentos com cartão no momento.');
    }

    const configuredProvider = String(settings?.cardGateway || '').trim();
    if (!configuredProvider) {
      throw new Error(
        'Pagamento com cartão indisponível. Configure o gateway nas configurações do restaurante.',
      );
    }

    if (!['MERCADO_PAGO', 'ASAAS', 'PAGBANK'].includes(configuredProvider.toUpperCase())) {
      throw new Error('Gateway inválido. Escolha Mercado Pago, Asaas ou PagBank.');
    }

    return normalizeCardProvider(configuredProvider);
  }

  ensureCardProviderSupported(provider: CardProvider) {
    getCardCheckoutProviderHandler(provider);
  }

  async execute(payload: CreateOrderCardCheckoutPayload) {
    if (payload.creationRequest) {
      const restaurantId = resolveOrderRestaurantId({
        requestedRestaurantId: payload.restaurantId,
        contextRestaurantId: payload.userRestaurantId,
      });
      const previous = await withTenantDbContext(restaurantId, (db) =>
        replayCreatedOrder(db, restaurantId, payload.creationRequest),
      );
      if (previous) throw new PaymentCreationUncertainError(previous.id, previous.publicId);
    }
    const resolvedCardProvider = await this.resolveCardProvider(payload);
    this.ensureCardProviderSupported(resolvedCardProvider);

    const createdOrder = await createOrderService.execute({
      ...payload,
      deferRealtimeUntilPaid: true,
      paid: false,
    });

    const successUrlBase = String(
      payload.successUrl || process.env.FRONTEND_URL || 'http://localhost:5173/cart',
    ).trim();
    const cancelUrlBase = String(payload.cancelUrl || successUrlBase).trim();

    let checkout: CardCheckoutResult;
    try {
      const providerHandler = getCardCheckoutProviderHandler(resolvedCardProvider);
      checkout = await providerHandler.createCheckout({
        payload,
        order: {
          id: createdOrder.id,
          publicId: createdOrder.publicId,
          restaurantId: createdOrder.restaurantId,
          total: createdOrder.total,
          systemFee: createdOrder.systemFee,
          restaurant: createdOrder.restaurant,
        },
        successUrlBase,
        cancelUrlBase,
      });
    } catch (error) {
      // Even a missing/malformed response can follow a successful charge or webhook.
      // Preserve the order, stock reservation and coupon until reconciliation.
      console.error('[CARD_PAYMENT_CREATION_UNCERTAIN]', {
        orderId: createdOrder.id,
        restaurantId: createdOrder.restaurantId,
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      throw new PaymentCreationUncertainError(createdOrder.id, createdOrder.publicId);
    }

    try {
      await orderRepository.setCardCheckoutSessionId(
        createdOrder.id,
        createdOrder.restaurantId,
        String(checkout.persistenceSessionId || checkout.sessionId),
      );
    } catch (error: unknown) {
      // Do not delete an order after an external checkout exists. Every
      // provider reference carries the order id and its webhook can reconcile.
      console.error(
        '[CARD_ORDER_PAYMENT_LINK_ERROR]',
        error instanceof Error ? error.message : String(error),
        { orderId: createdOrder.id, restaurantId: createdOrder.restaurantId },
      );
    }

    let paymentConfirmed = false;
    if (checkout.paymentApproved) {
      const finalizedOrder = await finalizeOrderCardPaymentService.execute({
        orderId: createdOrder.id,
        restaurantId: createdOrder.restaurantId,
        checkoutSessionId: String(checkout.persistenceSessionId || checkout.sessionId),
      });
      paymentConfirmed = finalizedOrder?.paid === true;
    }

    return {
      orderId: createdOrder.id,
      orderPublicId: createdOrder.publicId,
      provider: checkout.provider,
      sessionId: checkout.sessionId,
      checkoutUrl: checkout.checkoutUrl,
      paid: paymentConfirmed,
    };
  }
}

export default new CreateOrderCardCheckoutService();
