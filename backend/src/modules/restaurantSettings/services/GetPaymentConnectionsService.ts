import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import { getMercadoPagoAccessToken } from './RestaurantPaymentCredentialsService.js';
import { mercadoPagoWebhookSecrets } from '../../payments/providers/mercadoPagoWebhookSignature.js';
import { parseCredentialEncryptionKey } from '../security/credentialEncryption.js';
import { resolveOAuthEndpoint } from '../security/oauthEndpoints.js';
import { isBelvoOpenFinanceConfigured } from '../../payments/providers/belvoOpenFinance.js';

type Provider = 'MERCADO_PAGO' | 'PAGARME' | 'ASAAS';
type Connection = {
  provider: Provider;
  connected: boolean;
  canConnect: boolean;
  readyForPix: boolean;
  readyForCard: boolean;
  status:
    | 'NOT_CONNECTED'
    | 'CONNECTED'
    | 'NEEDS_RECONNECT'
    | 'PENDING_APPROVAL'
    | 'ACTION_REQUIRED'
    | 'UNAVAILABLE';
  message: string;
  onboardingUrl?: string | null;
};

const FUTURE_PROVIDER_MESSAGE =
  'Integração preparada, mas temporariamente indisponível. Será liberada quando a plataforma concluir o cadastro empresarial/CNPJ.';

function configured(...names: string[]) {
  return names.some((name) => Boolean(String(process.env[name] || '').trim()));
}

function publicHttps(value: string | undefined) {
  try {
    const url = new URL(value || '');
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function validCallback(value: string | undefined, path: string) {
  try {
    const backend = new URL(process.env.BACKEND_URL || '');
    const callback = new URL(value || `${backend.href.replace(/\/+$/, '')}${path}`);
    return (
      publicHttps(callback.href) &&
      callback.origin === backend.origin &&
      !callback.search &&
      !callback.hash
    );
  } catch {
    return false;
  }
}

export function paymentConnectionConfiguration(provider: Provider) {
  try {
    if (!parseCredentialEncryptionKey()) return false;

    // Asaas e Pagar.me permanecem estruturados para integração futura, mas
    // não podem ser ativados enquanto a plataforma não liberar o cadastro empresarial.
    if (provider === 'ASAAS' || provider === 'PAGARME') return false;

    if (!publicHttps(process.env.FRONTEND_URL) || !publicHttps(process.env.BACKEND_URL)) {
      return false;
    }

    resolveOAuthEndpoint('MERCADO_PAGO_API');
    resolveOAuthEndpoint('MERCADO_PAGO_AUTHORIZATION');

    return (
      configured('MP_OAUTH_CLIENT_ID', 'MP_CLIENT_ID', 'MERCADO_PAGO_CLIENT_ID') &&
      configured('MP_OAUTH_CLIENT_SECRET', 'MP_CLIENT_SECRET', 'MERCADO_PAGO_CLIENT_SECRET') &&
      validCallback(process.env.MP_OAUTH_REDIRECT_URI, '/settings/mercado-pago/oauth/callback') &&
      mercadoPagoWebhookSecrets().length > 0 &&
      publicHttps(
        process.env.MP_ORDER_NOTIFICATION_URL ||
          `${process.env.BACKEND_URL}/orders/webhook/mercadopago`,
      )
    );
  } catch {
    return false;
  }
}

class GetPaymentConnectionsService {
  async execute({ restaurantId }: { restaurantId: number | string }) {
    const id = Number(restaurantId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Restaurante inválido.');

    const settings = await restaurantSettingsRepository.findByRestaurantId(id);

    const connections: Connection[] = [
      {
        provider: 'MERCADO_PAGO',
        connected: Boolean(settings?.mercadoPagoAccessToken),
        canConnect: paymentConnectionConfiguration('MERCADO_PAGO'),
        readyForPix: false,
        readyForCard: false,
        status: 'NOT_CONNECTED',
        message: 'Conecte a conta Mercado Pago do restaurante para receber Pix e cartão.',
      },
      {
        provider: 'PAGARME',
        connected: false,
        canConnect: false,
        readyForPix: false,
        readyForCard: false,
        status: 'UNAVAILABLE',
        message: FUTURE_PROVIDER_MESSAGE,
      },
      {
        provider: 'ASAAS',
        connected: false,
        canConnect: false,
        readyForPix: false,
        readyForCard: false,
        status: 'UNAVAILABLE',
        message: FUTURE_PROVIDER_MESSAGE,
      },
    ];

    const mercadoPago = connections[0];
    if (mercadoPago.canConnect && mercadoPago.connected) {
      const renewable = Boolean(settings?.mercadoPagoRefreshToken);
      if (!renewable) {
        mercadoPago.status = 'NEEDS_RECONNECT';
        mercadoPago.message =
          'Conta vinculada sem renovação automática. Reconecte agora antes de receber pagamentos em produção.';
      } else if (!String(settings?.mercadoPagoPublicKey || '').trim()) {
        mercadoPago.status = 'NEEDS_RECONNECT';
        mercadoPago.message =
          'A conexão do Mercado Pago não possui a chave pública do restaurante. Reconecte a conta para receber pagamentos com cartão.';
      } else {
        try {
          await getMercadoPagoAccessToken(id);
          mercadoPago.readyForPix = true;
          mercadoPago.readyForCard = true;
          mercadoPago.status = 'CONNECTED';
          mercadoPago.message =
            'Conta Mercado Pago vinculada e pronta para receber Pix e cartão.';
        } catch {
          mercadoPago.status = 'NEEDS_RECONNECT';
          mercadoPago.message =
            'Não foi possível validar a conexão Mercado Pago. Conecte a conta novamente.';
        }
      }
    } else if (!mercadoPago.canConnect) {
      mercadoPago.status = 'UNAVAILABLE';
      mercadoPago.message =
        'A conexão Mercado Pago ainda não está configurada corretamente na plataforma.';
    }

    const openFinanceAvailable = isBelvoOpenFinanceConfigured();
    const openFinanceReady = Boolean(
      openFinanceAvailable &&
        settings?.openFinancePixEnabled &&
        String(settings?.pixKey || '').trim(),
    );

    return {
      connections,
      openFinance: {
        available: openFinanceAvailable,
        enabled: settings?.openFinancePixEnabled === true,
        ready: openFinanceReady,
        message: !openFinanceAvailable
          ? 'Pix pelo app do banco ainda não está habilitado pela plataforma.'
          : !settings?.openFinancePixEnabled
            ? 'Ative Pix pelo app do banco para oferecer Open Finance no checkout.'
            : !String(settings?.pixKey || '').trim()
              ? 'Cadastre a chave Pix do restaurante para receber via Open Finance.'
              : 'Pix pelo app do banco está pronto para uso.',
      },
    };
  }
}

export default new GetPaymentConnectionsService();
