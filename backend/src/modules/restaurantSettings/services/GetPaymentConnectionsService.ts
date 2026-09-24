import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import { getMercadoPagoAccessToken } from './RestaurantPaymentCredentialsService.js';
import getAsaasConnectionStatusService from './GetAsaasConnectionStatusService.js';
import {
  asaasPlatformEnabled,
  asaasWebhookConfiguration,
} from './asaasConnectionApi.js';
import {
  pagarmeJson,
  validatePagarmeKeys,
} from '../../payments/providers/pagarmeV5.js';
import { futurePaymentProvidersEnabled } from '../../payments/providers/futurePaymentProviders.js';
import { mercadoPagoWebhookSecrets } from '../../payments/providers/mercadoPagoWebhookSignature.js';
import { parseCredentialEncryptionKey } from '../security/credentialEncryption.js';
import { resolveOAuthEndpoint } from '../security/oauthEndpoints.js';

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
  'Integração preparada para uso futuro. Temporariamente indisponível.';

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

    if (provider === 'PAGARME') return futurePaymentProvidersEnabled();
    if (provider === 'ASAAS') {
      if (!futurePaymentProvidersEnabled() || !asaasPlatformEnabled()) return false;
      asaasWebhookConfiguration('');
      return configured('ASAAS_API_KEY');
    }

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
        connected: Boolean(settings?.pagarmeSecretKey && settings?.pagarmePublicKey),
        canConnect: paymentConnectionConfiguration('PAGARME'),
        readyForPix: false,
        readyForCard: false,
        status: 'UNAVAILABLE',
        message: FUTURE_PROVIDER_MESSAGE,
      },
      {
        provider: 'ASAAS',
        connected: Boolean(settings?.asaasAccessToken),
        canConnect: paymentConnectionConfiguration('ASAAS'),
        readyForPix: false,
        readyForCard: false,
        status: 'UNAVAILABLE',
        message: FUTURE_PROVIDER_MESSAGE,
      },
    ];

    const pagarme = connections.find((item) => item.provider === 'PAGARME')!;
    if (pagarme.canConnect && pagarme.connected) {
      try {
        const credentials = validatePagarmeKeys(
          settings?.pagarmeSecretKey,
          settings?.pagarmePublicKey,
        );
        const check = await pagarmeJson<Record<string, unknown>>(
          credentials.secretKey,
          '/orders?page=1&size=1',
          { method: 'GET', signal: AbortSignal.timeout(8_000) },
        );
        if (check.response.ok) {
          pagarme.readyForPix = true;
          pagarme.readyForCard = true;
          pagarme.status = 'CONNECTED';
          pagarme.message = 'Pagar.me validado e pronto para receber Pix e cartão.';
        } else {
          pagarme.status = 'ACTION_REQUIRED';
          pagarme.message = 'As chaves Pagar.me não foram aceitas. Revise as credenciais.';
        }
      } catch {
        pagarme.status = 'ACTION_REQUIRED';
        pagarme.message = 'Não foi possível validar as credenciais Pagar.me.';
      }
    } else if (pagarme.canConnect) {
      pagarme.status = 'NOT_CONNECTED';
      pagarme.message = 'Informe as chaves Pagar.me do restaurante para concluir a conexão.';
    }

    const asaas = connections.find((item) => item.provider === 'ASAAS')!;
    if (asaas.canConnect) {
      const status = await getAsaasConnectionStatusService.execute({ restaurantId: id });
      if (status.recoveryRequired) {
        asaas.canConnect = false;
        asaas.status = 'ACTION_REQUIRED';
        asaas.message = status.message;
      } else if (asaas.connected) {
        asaas.readyForPix = status.readyForPayments;
        asaas.readyForCard = status.readyForPayments;
        asaas.status = status.readyForPayments
          ? 'CONNECTED'
          : status.approvalStatus === 'PENDING'
            ? 'PENDING_APPROVAL'
            : 'ACTION_REQUIRED';
        asaas.message = status.message;
        asaas.onboardingUrl = status.onboardingUrl;
      } else {
        asaas.status = 'NOT_CONNECTED';
        asaas.message = 'Crie e vincule a conta Asaas do restaurante.';
      }
    }

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

    return {
      connections,
      openFinance: {
        available: false,
        enabled: settings?.openFinancePixEnabled === true,
        ready: false,
        message:
          'Open Finance está temporariamente indisponível enquanto a integração Mercado Pago é preparada.',
      },
    };
  }
}

export default new GetPaymentConnectionsService();
