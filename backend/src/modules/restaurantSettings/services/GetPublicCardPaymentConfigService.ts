import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import { futurePaymentProvidersEnabled } from '../../payments/providers/futurePaymentProviders.js';

type SupportedCardProvider = 'MERCADO_PAGO' | 'PAGARME' | 'ASAAS';

function normalizeProvider(value: unknown): SupportedCardProvider | null {
  const provider = String(value || '').trim().toUpperCase();
  return ['MERCADO_PAGO', 'PAGARME', 'ASAAS'].includes(provider)
    ? (provider as SupportedCardProvider)
    : null;
}

class GetPublicCardPaymentConfigService {
  async execute(restaurantId: number | string) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isSafeInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido.');
    }

    const settings =
      await restaurantSettingsRepository.findByRestaurantId(normalizedRestaurantId);
    const provider = normalizeProvider(settings?.cardGateway);

    if (!provider) {
      throw new Error('Pagamento com cartão não está configurado neste restaurante.');
    }

    if (provider === 'PAGARME') {
      if (!futurePaymentProvidersEnabled()) {
        throw new Error('Pagar.me temporariamente indisponível.');
      }
      const publicKey = String(settings?.pagarmePublicKey || '').trim();
      if (!publicKey) throw new Error('Pagar.me ainda não foi configurado para este restaurante.');
      return { provider, publicKey } as const;
    }

    if (provider === 'ASAAS') {
      if (!futurePaymentProvidersEnabled()) {
        throw new Error('Asaas temporariamente indisponível.');
      }
      return { provider } as const;
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
