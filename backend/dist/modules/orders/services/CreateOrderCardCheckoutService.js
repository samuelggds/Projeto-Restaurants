import createOrderService from "./CreateOrderService.js";
import orderRepository from "../repositories/OrderRepository.js";
import restaurantSettingsRepository from "../../restaurantSettings/repositories/RestaurantSettingsRepository.js";
import { CARD_PROVIDERS, normalizeCardProvider, } from "../../payments/providers/providerCatalog.js";
import { getCardCheckoutProviderHandler, } from "./cardCheckoutProviders.js";
class CreateOrderCardCheckoutService {
    async resolveCardProvider(payload) {
        const requestedProvider = normalizeCardProvider(payload.cardProvider);
        if (payload.cardProvider) {
            return requestedProvider;
        }
        const resolvedRestaurantId = Number(payload.restaurantId) || Number(payload.userRestaurantId) || 0;
        if (!resolvedRestaurantId) {
            return CARD_PROVIDERS.MERCADO_PAGO;
        }
        const settings = await restaurantSettingsRepository.findByRestaurantId(resolvedRestaurantId);
        return normalizeCardProvider(settings?.cardGateway);
    }
    ensureCardProviderSupported(provider) {
        getCardCheckoutProviderHandler(provider);
    }
    async execute(payload) {
        const resolvedCardProvider = await this.resolveCardProvider(payload);
        this.ensureCardProviderSupported(resolvedCardProvider);
        const createdOrder = await createOrderService.execute({
            ...payload,
            deferRealtimeUntilPaid: false,
            paid: false,
        });
        const successUrlBase = String(payload.successUrl ||
            process.env.FRONTEND_URL ||
            "http://localhost:5173/cart").trim();
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
            await orderRepository.setCardCheckoutSessionId(createdOrder.id, createdOrder.restaurantId, String(checkout.persistenceSessionId || checkout.sessionId));
            return {
                orderId: createdOrder.id,
                provider: checkout.provider,
                sessionId: checkout.sessionId,
                checkoutUrl: checkout.checkoutUrl,
            };
        }
        catch (error) {
            await orderRepository.deleteById(createdOrder.id, createdOrder.restaurantId);
            throw error;
        }
    }
}
export default new CreateOrderCardCheckoutService();
