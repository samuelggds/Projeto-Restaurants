import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';

type SupportedCardProvider = 'MERCADO_PAGO' | 'PAGARME' | 'ASAAS';

function normalizeProvider(value: unknown): SupportedCardProvider | null {
  const provider = String(value || '').trim().toUpperCase();
  return ['MERCADO_PAGO', 'PAGARME', 'ASAAS'].includes(provider)
    ? (provider as SupportedCardProvider)
    : null;
}

class GetPublicCardPaymentConfigService {
  async execute({ restaurantId }: { restaurantId: number | string }) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isSafeInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido.');
    }

    const settings =
      await restaurantSettingsRepository.findPublicByRestaurantId(normalizedRestaurantId);
    const provider = normalizeProvider(settings?.cardGateway);

    // Apenas Mercado Pago está ativo neste momento. Pagar.me e Asaas ficam
    // estruturados para integração futura, mas não podem ser usados no checkout.
    if (provider !== 'MERCADO_PAGO') {
      throw new Error(
        'Pagamento com cartão temporariamente indisponível. No momento, apenas Mercado Pago está ativo.',
      );
    }

    const publicKey = String(settings?.mercadoPagoPublicKey || '').trim();
    if (!publicKey) {
      throw new Error(
        'A conexão Mercado Pago deste restaurante precisa ser atualizada antes de aceitar cartão.',
      );
    }

    return { provider, publicKey } as const;
  }
}

export default new GetPublicCardPaymentConfigService();
