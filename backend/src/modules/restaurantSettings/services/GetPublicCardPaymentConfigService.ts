import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import { getPagBankAccessToken } from './RestaurantPaymentCredentialsService.js';
import { pagBankApiBaseUrl } from '../../payments/providers/pagBankCheckout.js';

type SupportedCardProvider = 'MERCADO_PAGO' | 'PAGBANK' | 'ASAAS';

function normalizeProvider(value: unknown): SupportedCardProvider | null {
  const provider = String(value || '').trim().toUpperCase();
  return ['MERCADO_PAGO', 'PAGBANK', 'ASAAS'].includes(provider)
    ? (provider as SupportedCardProvider)
    : null;
}

async function fetchPagBankPublicKey(restaurantId: number) {
  const accessToken = await getPagBankAccessToken(restaurantId);
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const readCurrent = async () => {
    const response = await fetch(`${pagBankApiBaseUrl()}/public-keys/card`, {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
      headers,
    });
    if (!response.ok) return '';
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return String(body.public_key || body.publicKey || '').trim();
  };

  const current = await readCurrent();
  if (current) return current;

  const response = await fetch(`${pagBankApiBaseUrl()}/public-keys`, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
    headers,
    body: JSON.stringify({ type: 'card' }),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const publicKey = String(body.public_key || body.publicKey || '').trim();
  if (!response.ok || !publicKey) {
    throw new Error('Pagamento com cartão indisponível no momento.');
  }
  return publicKey;
}

class GetPublicCardPaymentConfigService {
  async execute(rawRestaurantId: unknown) {
    const restaurantId = Number(rawRestaurantId || 0);
    if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) {
      throw new Error('Restaurante inválido.');
    }

    const [restaurant, settings] = await Promise.all([
      restaurantSettingsRepository.findRestaurantById(restaurantId),
      restaurantSettingsRepository.findByRestaurantId(restaurantId),
    ]);
    if (!restaurant || restaurant.active === false || !settings || settings.acceptsCard === false) {
      throw new Error('Pagamento com cartão indisponível no momento.');
    }

    const provider = normalizeProvider(settings.cardGateway);
    if (!provider) throw new Error('Pagamento com cartão indisponível no momento.');

    if (provider === 'MERCADO_PAGO') {
      const publicKey = String(settings.mercadoPagoPublicKey || '').trim();
      if (!publicKey) {
        throw new Error(
          'Pagamento com cartão indisponível. Reconecte o Mercado Pago deste restaurante.',
        );
      }
      return {
        provider,
        publicKey,
      } as const;
    }

    if (provider === 'PAGBANK') {
      return { provider, publicKey: await fetchPagBankPublicKey(restaurantId) } as const;
    }

    return { provider } as const;
  }
}

export default new GetPublicCardPaymentConfigService();