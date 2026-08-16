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
  type CreateOrderCardCheckoutPayload,
} from './cardCheckoutProviders.js';

class CreateOrderCardCheckoutService {
  async resolveCardProvider(payload: CreateOrderCardCheckoutPayload) {
    const resolvedRestaurantId =
      Number(payload.restaurantId) || Number(payload.userRestaurantId) || 0;

    if (!resolvedRestaurantId) {
      throw new Error('Restaurante inválido para pagamento com cartão.');
    }

    const settings = await restaurantSettingsRepository.findByRestaurantId(resolvedRestaurantId);

    assertRestaurantIsOpenForOrders(settings?.isOpenForOrders);

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

    try {
      const providerHandler = getCardCheckoutProviderHandler(resolvedCardProvider);
      const checkout = await providerHandler.createCheckout({
        payload,
        order: {
          id: createdOrder.id,
          restaurantId: createdOrder.restaurantId,
          total: createdOrder.total,
          systemFee: createdOrder.systemFee,
          restaurant: createdOrder.restaurant,
        },
        successUrlBase,
        cancelUrlBase,
      });

      await orderRepository.setCardCheckoutSessionId(
        createdOrder.id,
        createdOrder.restaurantId,
        String(checkout.persistenceSessionId || checkout.sessionId),
      );

      return {
        orderId: createdOrder.id,
        provider: checkout.provider,
        sessionId: checkout.sessionId,
        checkoutUrl: checkout.checkoutUrl,
      };
    } catch (error) {
      await orderRepository.deleteById(createdOrder.id, createdOrder.restaurantId);
      throw error;
    }
  }
}

export default new CreateOrderCardCheckoutService();
