import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import getAsaasConnectionStatusService from './GetAsaasConnectionStatusService.js';
import {
  pagarmeJson,
  validatePagarmeKeys,
} from '../../payments/providers/pagarmeV5.js';
import { efiOpenFinanceConfigured } from '../../payments/providers/efiOpenFinance.js';
import {
  getMercadoPagoAccountReadiness,
  paymentConnectionConfiguration,
} from './RestaurantPaymentReadinessService.js';

export { paymentConnectionConfiguration } from './RestaurantPaymentReadinessService.js';

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

class GetPaymentConnectionsService {
  async execute({ restaurantId }: { restaurantId: number | string }) {
    const id = Number(restaurantId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Restaurante inválido.');

    const settings = await restaurantSettingsRepository.findByRestaurantId(id);
    const mercadoPagoCanConnect = paymentConnectionConfiguration('MERCADO_PAGO');
    const mercadoPagoAccount = mercadoPagoCanConnect
      ? await getMercadoPagoAccountReadiness({ restaurantId: id, settings })
      : null;

    const connections: Connection[] = [
      {
        provider: 'MERCADO_PAGO',
        connected: mercadoPagoAccount?.connected ?? Boolean(settings?.mercadoPagoAccessToken),
        canConnect: mercadoPagoCanConnect,
        readyForPix: mercadoPagoCanConnect && mercadoPagoAccount?.readyForPix === true,
        readyForCard: mercadoPagoCanConnect && mercadoPagoAccount?.readyForCard === true,
        status: mercadoPagoCanConnect
          ? mercadoPagoAccount?.status || 'NOT_CONNECTED'
          : 'UNAVAILABLE',
        message: mercadoPagoCanConnect
          ? mercadoPagoAccount?.message ||
            'Conecte a conta Mercado Pago do restaurante para receber Pix e cartão.'
          : 'A conexão Mercado Pago ainda não está configurada corretamente na plataforma.',
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

    const openFinanceAvailable = efiOpenFinanceConfigured();
    const beneficiaryPixKey = String(settings?.pixKey || '').trim();
    const openFinanceReady = Boolean(
      openFinanceAvailable &&
        settings?.openFinancePixEnabled === true &&
        beneficiaryPixKey,
    );

    return {
      connections,
      openFinance: {
        provider: 'EFI',
        available: openFinanceAvailable,
        enabled: settings?.openFinancePixEnabled === true,
        ready: openFinanceReady,
        message: !openFinanceAvailable
          ? 'A integração Open Finance da Efí ainda não está configurada pela plataforma.'
          : !beneficiaryPixKey
            ? 'Informe a chave Pix que receberá os pagamentos Open Finance deste restaurante.'
            : !settings?.openFinancePixEnabled
              ? 'Ative o Open Finance para permitir que o cliente escolha o banco e autorize o Pix.'
              : 'Efí Open Finance pronta. O cliente escolhe o banco e autoriza o pagamento no ambiente da instituição.',
      },
    };
  }
}

export default new GetPaymentConnectionsService();
