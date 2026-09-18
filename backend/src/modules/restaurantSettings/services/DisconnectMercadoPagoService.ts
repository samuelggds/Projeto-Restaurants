import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';

class DisconnectMercadoPagoService {
  async execute({ restaurantId }: { restaurantId: number | string }) {
    const id = Number(restaurantId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('Restaurante inválido.');
    }

    const settings = await restaurantSettingsRepository.findByRestaurantId(id);
    if (!settings) {
      throw new Error('Configurações não encontradas.');
    }

    const wasConnected = Boolean(
      settings.mercadoPagoAccessToken ||
        settings.mercadoPagoRefreshToken ||
        settings.mercadoPagoPublicKey,
    );

    const disablesPix = settings.pixProvider === 'MERCADO_PAGO' && settings.acceptsPix === true;
    const disablesCard =
      settings.cardGateway === 'MERCADO_PAGO' && settings.acceptsCard === true;

    await restaurantSettingsRepository.update(id, {
      mercadoPagoAccessToken: null,
      mercadoPagoRefreshToken: null,
      mercadoPagoTokenExpiresAt: null,
      mercadoPagoPublicKey: null,
      ...(disablesPix ? { acceptsPix: false } : {}),
      ...(disablesCard ? { acceptsCard: false } : {}),
    });

    return {
      disconnected: true,
      wasConnected,
      disabledMethods: {
        pix: disablesPix,
        card: disablesCard,
      },
    };
  }
}

export default new DisconnectMercadoPagoService();
