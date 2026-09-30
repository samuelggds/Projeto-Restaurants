import { asaasPlatformEnabled, asaasWebhookConfiguration } from './asaasConnectionApi.js';
import { getMercadoPagoAccessToken } from './RestaurantPaymentCredentialsService.js';
import { futurePaymentProvidersEnabled } from '../../payments/providers/futurePaymentProviders.js';
import { mercadoPagoWebhookSecrets } from '../../payments/providers/mercadoPagoWebhookSignature.js';
import { parseCredentialEncryptionKey } from '../security/credentialEncryption.js';
import { resolveOAuthEndpoint } from '../security/oauthEndpoints.js';

export type PaymentConnectionProvider = 'MERCADO_PAGO' | 'PAGARME' | 'ASAAS';

export type MercadoPagoAccountReadiness = {
  connected: boolean;
  readyForPix: boolean;
  readyForCard: boolean;
  status: 'NOT_CONNECTED' | 'CONNECTED' | 'NEEDS_RECONNECT';
  message: string;
};

type MercadoPagoSettings = {
  mercadoPagoAccessToken?: unknown;
  mercadoPagoRefreshToken?: unknown;
  mercadoPagoPublicKey?: unknown;
} | null | undefined;

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

export function paymentConnectionConfiguration(provider: PaymentConnectionProvider) {
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

export async function getMercadoPagoAccountReadiness({
  restaurantId,
  settings,
}: {
  restaurantId: number | string;
  settings: MercadoPagoSettings;
}): Promise<MercadoPagoAccountReadiness> {
  const id = Number(restaurantId);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Restaurante inválido.');

  const connected = Boolean(String(settings?.mercadoPagoAccessToken || '').trim());
  if (!connected) {
    return {
      connected: false,
      readyForPix: false,
      readyForCard: false,
      status: 'NOT_CONNECTED',
      message: 'Conecte a conta Mercado Pago do restaurante para receber Pix e cartão.',
    };
  }

  if (!String(settings?.mercadoPagoRefreshToken || '').trim()) {
    return {
      connected: true,
      readyForPix: false,
      readyForCard: false,
      status: 'NEEDS_RECONNECT',
      message:
        'Conta vinculada sem renovação automática. Reconecte agora antes de receber pagamentos em produção.',
    };
  }

  if (!String(settings?.mercadoPagoPublicKey || '').trim()) {
    return {
      connected: true,
      readyForPix: false,
      readyForCard: false,
      status: 'NEEDS_RECONNECT',
      message:
        'A conexão do Mercado Pago não possui a chave pública do restaurante. Reconecte a conta para receber pagamentos com cartão.',
    };
  }

  try {
    await getMercadoPagoAccessToken(id);
    return {
      connected: true,
      readyForPix: true,
      readyForCard: true,
      status: 'CONNECTED',
      message: 'Conta Mercado Pago vinculada e pronta para receber Pix e cartão.',
    };
  } catch {
    return {
      connected: true,
      readyForPix: false,
      readyForCard: false,
      status: 'NEEDS_RECONNECT',
      message: 'Não foi possível validar a conexão Mercado Pago. Conecte a conta novamente.',
    };
  }
}
