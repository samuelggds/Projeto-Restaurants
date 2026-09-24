import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import { getMercadoPagoAccessToken } from './RestaurantPaymentCredentialsService.js';
import getAsaasConnectionStatusService from './GetAsaasConnectionStatusService.js';
import {
  ASAAS_TEMPORARILY_UNAVAILABLE_MESSAGE,
  asaasPlatformEnabled,
  asaasWebhookConfiguration,
} from './asaasConnectionApi.js';
import { mercadoPagoWebhookSecrets } from '../../payments/providers/mercadoPagoWebhookSignature.js';
import {
  pagarmeJson,
  validatePagarmeKeys,
} from '../../payments/providers/pagarmeV5.js';
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
    if (provider === 'ASAAS') {
      if (!asaasPlatformEnabled()) return false;
      asaasWebhookConfiguration('');
      return configured('ASAAS_API_KEY');
    }
    if (provider === 'PAGARME') {
      return true;
    }
    if (!publicHttps(process.env.FRONTEND_URL) || !publicHttps(process.env.BACKEND_URL))
      return false;
    if (provider === 'MERCADO_PAGO') {
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
    }
    return false;
  } catch {
    return false;
  }
}

class GetPaymentConnectionsService {
  async execute({ restaurantId }: { restaurantId: number | string }) {
    const id = Number(restaurantId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Restaurante inválido.');
    const settings = await restaurantSettingsRepository.findByRestaurantId(id);
    const connections = await Promise.all(
      (['MERCADO_PAGO', 'PAGARME', 'ASAAS'] as const).map(async (provider): Promise<Connection> => {
        const connected = Boolean(
          provider === 'MERCADO_PAGO'
            ? settings?.mercadoPagoAccessToken
            : provider === 'PAGARME'
              ? settings?.pagarmeSecretKey && settings?.pagarmePublicKey
              : settings?.asaasAccessToken,
        );
        const canConnect = paymentConnectionConfiguration(provider);
        const unavailableMessage =
          provider === 'ASAAS' && !asaasPlatformEnabled()
            ? ASAAS_TEMPORARILY_UNAVAILABLE_MESSAGE
            : 'A conexão está sendo preparada pela plataforma. Tente novamente após a configuração.';
        const result: Connection = {
          provider,
          connected,
          canConnect,
          readyForPix: false,
          readyForCard: false,
          status: !canConnect ? 'UNAVAILABLE' : 'NOT_CONNECTED',
          message: !canConnect
            ? unavailableMessage
            : 'Conecte a conta do restaurante para receber por Pix e cartão.',
        };

        if (provider === 'ASAAS') {
          if (!asaasPlatformEnabled()) return result;
          const status = await getAsaasConnectionStatusService.execute({ restaurantId: id });
          if (status.recoveryRequired)
            return {
              ...result,
              canConnect: false,
              status: 'ACTION_REQUIRED',
              message: status.message,
            };
          if (!canConnect || !connected) return result;
          return {
            ...result,
            readyForPix: status.readyForPayments,
            readyForCard: status.readyForPayments,
            status: status.readyForPayments
              ? 'CONNECTED'
              : status.approvalStatus === 'PENDING'
                ? 'PENDING_APPROVAL'
                : 'ACTION_REQUIRED',
            message: status.message,
            onboardingUrl: status.onboardingUrl,
          };
        }
        if (provider === 'PAGARME') {
          if (!connected) return result;
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
            if (!check.response.ok) {
              return {
                ...result,
                status: 'ACTION_REQUIRED',
                message:
                  'As chaves do Pagar.me não foram aceitas. Revise as credenciais e salve novamente.',
              };
            }
            return {
              ...result,
              readyForPix: true,
              readyForCard: true,
              status: 'CONNECTED',
              message:
                'Pagar.me validado para receber Pix e cartão nesta conta do restaurante.',
            };
          } catch {
            return {
              ...result,
              status: 'ACTION_REQUIRED',
              message:
                'Não foi possível validar o Pagar.me. Revise as chaves e o ambiente configurado.',
            };
          }
        }
        if (!canConnect || !connected) return result;

        const renewable = Boolean(settings?.mercadoPagoRefreshToken);
        if (!renewable) {
          return {
            ...result,
            status: 'NEEDS_RECONNECT',
            message:
              'Conta vinculada sem renovação automática. Reconecte agora antes de receber pagamentos em produção.',
          };
        }

        if (
          provider === 'MERCADO_PAGO' &&
          !String(settings?.mercadoPagoPublicKey || '').trim()
        ) {
          return {
            ...result,
            status: 'NEEDS_RECONNECT',
            message:
              'A conexão do Mercado Pago não possui a chave pública do restaurante. Reconecte a conta para receber pagamentos com cartão.',
          };
        }

        try {
          await getMercadoPagoAccessToken(id);
          return {
            ...result,
            readyForPix: true,
            readyForCard: true,
            status: 'CONNECTED',
            message:
              'Conta vinculada para receber Pix e cartão. A aprovação de cada pagamento é confirmada pela empresa.',
          };
        } catch {
          return {
            ...result,
            status: 'NEEDS_RECONNECT',
            message:
              'Não foi possível validar a conexão. Conecte a conta novamente para retomar os pagamentos.',
          };
        }
      }),
    );
    return { connections };
  }
}

export default new GetPaymentConnectionsService();
