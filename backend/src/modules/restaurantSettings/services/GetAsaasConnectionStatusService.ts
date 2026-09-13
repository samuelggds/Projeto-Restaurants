import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import {
  asaasRequest,
  asaasWebhookConfiguration,
  findAsaasWebhook,
  isAsaasWebhookReady,
  asaasWebhookTokenHash,
} from './asaasConnectionApi.js';

type ApprovalStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'UNKNOWN';

function safeOnboardingUrl(value: unknown) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' &&
      (url.hostname === 'asaas.com' || url.hostname.endsWith('.asaas.com'))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

class GetAsaasConnectionStatusService {
  async execute({ restaurantId }: { restaurantId: number | string }) {
    const id = Number(restaurantId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Restaurante inválido.');
    const settings = await restaurantSettingsRepository.findByRestaurantId(id);
    const token = String(settings?.asaasAccessToken || '').trim();
    const recoveryRequired = ['CREATING', 'REQUIRES_RECOVERY'].includes(
      String(settings?.asaasOnboardingState || ''),
    );
    const result = {
      restaurantId: id,
      accountId: settings?.asaasAccountId || null,
      walletId: settings?.gatewayMerchantId || null,
      credentialsConfigured: Boolean(token),
      asaasSubaccountTokenConfigured: Boolean(token),
      webhookConfigured: false,
      approvalStatus: 'UNKNOWN' as ApprovalStatus,
      readyForPayments: false,
      recoveryRequired,
      onboardingUrl: null as string | null,
      message: recoveryRequired
        ? 'A criação anterior precisa ser conferida. Nenhuma nova conta será criada automaticamente.'
        : token
          ? 'Não foi possível confirmar a situação da conta Asaas.'
          : 'Vincule sua conta Asaas.',
    };
    if (!token || recoveryRequired) return result;

    try {
      const config = asaasWebhookConfiguration(
        settings?.ownerEmail || settings?.restaurant?.email || '',
      );
      const [status, commercial, webhook] = await Promise.all([
        asaasRequest<{ general?: string; documentation?: string }>('/myAccount/status', token),
        asaasRequest<{ commercialInfoExpiration?: { isExpired?: boolean } }>(
          '/myAccount/commercialInfo',
          token,
        ),
        findAsaasWebhook(token, config.url),
      ]);
      const general = String(status.general || '').toUpperCase();
      result.approvalStatus =
        general === 'APPROVED'
          ? 'APPROVED'
          : general === 'REJECTED'
            ? 'REJECTED'
            : ['PENDING', 'AWAITING_APPROVAL'].includes(general)
              ? 'PENDING'
              : 'UNKNOWN';
      result.webhookConfigured =
        isAsaasWebhookReady(webhook) &&
        Boolean(
          settings?.asaasWebhookId &&
          settings.asaasWebhookId === webhook?.id &&
          settings.asaasWebhookTokenHash === asaasWebhookTokenHash(),
        );
      const commercialExpired = commercial.commercialInfoExpiration?.isExpired === true;
      result.readyForPayments =
        result.approvalStatus === 'APPROVED' && result.webhookConfigured && !commercialExpired;
      result.message = commercialExpired
        ? 'Atualize os dados comerciais da conta no Asaas para retomar os pagamentos.'
        : result.approvalStatus === 'REJECTED'
          ? 'O Asaas solicitou a regularização do cadastro. Consulte sua conta.'
          : result.approvalStatus !== 'APPROVED'
            ? 'Conta vinculada. Conclua a ativação e os documentos solicitados pelo Asaas.'
            : !result.webhookConfigured
              ? 'Reconecte a conta para concluir a confirmação automática dos pagamentos.'
              : 'Conta aprovada e confirmação de pagamentos configurada.';
      if (result.approvalStatus !== 'APPROVED') {
        const documents = await asaasRequest<{ data?: { onboardingUrl?: string }[] }>(
          '/myAccount/documents',
          token,
        ).catch(() => null);
        result.onboardingUrl =
          (documents?.data || [])
            .map((document) => safeOnboardingUrl(document.onboardingUrl))
            .find(Boolean) || null;
      }
    } catch {
      // A chave salva ou uma falha de consulta não comprova aprovação da conta.
    }
    return result;
  }
}

export default new GetAsaasConnectionStatusService();
