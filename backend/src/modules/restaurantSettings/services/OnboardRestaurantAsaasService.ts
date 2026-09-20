import { isBoundedEmail } from '../../../validators/boundedEmail.js';
import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import { isValidCnpj, isValidCpf } from '../utils/adminSettingsValidation.js';
import {
  AsaasProviderError,
  asaasRequest,
  asaasWebhookConfiguration,
  ensureAsaasWebhook,
  asaasWebhookTokenHash,
} from './asaasConnectionApi.js';
import getAsaasConnectionStatusService from './GetAsaasConnectionStatusService.js';

type OnboardRestaurantAsaasPayload = {
  restaurantId: number | string;
  cnpj?: string;
  cpf?: string;
  restaurantName: string;
  pixKey?: string;
  email?: string | null;
  mobilePhone?: string | null;
  incomeValue?: number | string | null;
  address?: string | null;
  addressNumber?: string | null;
  province?: string | null;
  postalCode?: string | null;
  birthDate?: string | null;
  companyType?: string | null;
};

type AsaasErrorItem = {
  description?: string;
};

type AsaasCreateAccountResponse = {
  id?: string;
  walletId?: string;
  apiKey?: string;
  accessToken?: string;
  errors?: AsaasErrorItem[];
};

class OnboardRestaurantAsaasService {
  private normalizeDocument(value: string) {
    return String(value || '').replace(/\D/g, '');
  }

  private resolveDocumentType(value: string) {
    if (value.length === 14) {
      return 'CNPJ';
    }

    if (value.length === 11) {
      return 'CPF';
    }

    return null;
  }

  private normalizeMobilePhone(value: unknown) {
    const digits = String(value || '').replace(/\D/g, '');
    const withoutBrazilCountryCode =
      digits.length >= 12 && digits.startsWith('55') ? digits.slice(2) : digits;

    return /^\d{10,11}$/.test(withoutBrazilCountryCode) ? withoutBrazilCountryCode : '';
  }

  private normalizePostalCode(value: unknown) {
    const digits = String(value || '').replace(/\D/g, '');
    return /^\d{8}$/.test(digits) ? digits : '';
  }

  private getAsaasApiKey() {
    return String(process.env.ASAAS_API_KEY || '').trim();
  }

  private extractAsaasToken(payload: AsaasCreateAccountResponse) {
    return String(payload?.accessToken || payload?.apiKey || '').trim();
  }

  async execute({
    restaurantId,
    cnpj,
    cpf,
    restaurantName,
    pixKey,
    email,
    mobilePhone,
    incomeValue,
    address,
    addressNumber,
    province,
    postalCode,
    birthDate,
    companyType,
  }: OnboardRestaurantAsaasPayload) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante invalido para onboarding Asaas.');
    }

    const existingSettings =
      await restaurantSettingsRepository.findByRestaurantId(normalizedRestaurantId);
    const restaurant =
      existingSettings?.restaurant ||
      (await restaurantSettingsRepository.findRestaurantById(normalizedRestaurantId));

    if (!restaurant) {
      throw new Error('Restaurante nao encontrado para onboarding Asaas.');
    }

    const existingToken = String(existingSettings?.asaasAccessToken || '').trim();
    if (
      existingToken &&
      !['CREATING', 'REQUIRES_RECOVERY'].includes(
        String(existingSettings?.asaasOnboardingState || ''),
      )
    ) {
      const webhookId = await ensureAsaasWebhook(
        existingToken,
        String(existingSettings?.ownerEmail || restaurant.email || '').trim(),
      );
      await restaurantSettingsRepository.update(normalizedRestaurantId, {
        asaasWebhookId: webhookId,
        asaasWebhookTokenHash: asaasWebhookTokenHash(),
      });
      return {
        ...(await getAsaasConnectionStatusService.execute({
          restaurantId: normalizedRestaurantId,
        })),
        reused: true,
      };
    }
    if (
      existingSettings?.asaasAccountId ||
      ['CREATING', 'REQUIRES_RECOVERY'].includes(
        String(existingSettings?.asaasOnboardingState || ''),
      )
    ) {
      throw new Error(
        'A criação anterior precisa de conferência. Nenhuma nova subconta foi criada. Entre em contato com o suporte.',
      );
    }

    const normalizedCnpj = this.normalizeDocument(
      cnpj || (cpf ? '' : existingSettings?.companyDocument || restaurant.cnpj || ''),
    );
    const normalizedCpf = this.normalizeDocument(cpf || '');

    if (normalizedCnpj && normalizedCpf && normalizedCnpj !== normalizedCpf) {
      throw new Error('Informe apenas um documento valido: CPF ou CNPJ.');
    }

    const normalizedDocument = normalizedCnpj || normalizedCpf;
    const legalDocumentType = this.resolveDocumentType(normalizedDocument);
    const normalizedRestaurantName = String(
      restaurantName ||
        existingSettings?.companyTradeName ||
        existingSettings?.companyLegalName ||
        restaurant.name ||
        '',
    ).trim();
    const normalizedPixKey = String(pixKey || '').trim();
    const normalizedEmail = String(email || existingSettings?.ownerEmail || restaurant.email || '')
      .trim()
      .toLowerCase();
    const normalizedMobilePhone = this.normalizeMobilePhone(
      mobilePhone || existingSettings?.ownerPhone || restaurant.phone || restaurant.whatsapp,
    );
    const normalizedAddress = String(address || restaurant.address || '').trim();
    const normalizedAddressNumber = String(addressNumber || restaurant.addressNumber || '').trim();
    const normalizedProvince = String(province || restaurant.addressDistrict || '').trim();
    const normalizedPostalCode = this.normalizePostalCode(postalCode || restaurant.zipCode);
    const incomeCandidate =
      incomeValue === undefined || incomeValue === null || incomeValue === ''
        ? existingSettings?.monthlyRevenue
        : incomeValue;
    const normalizedIncomeValue = Number(incomeCandidate);

    if (!legalDocumentType) {
      throw new Error('Documento invalido. Informe CPF (11) ou CNPJ (14) digitos.');
    }

    if (
      (legalDocumentType === 'CPF' && !isValidCpf(normalizedDocument)) ||
      (legalDocumentType === 'CNPJ' && !isValidCnpj(normalizedDocument))
    ) {
      throw new Error(`${legalDocumentType} invalido.`);
    }

    if (normalizedRestaurantName.length < 2) {
      throw new Error('Nome do restaurante invalido.');
    }

    if (!isBoundedEmail(normalizedEmail)) {
      throw new Error('E-mail do responsavel invalido. Complete os dados gerais do restaurante.');
    }

    if (!normalizedMobilePhone) {
      throw new Error('Celular do responsavel invalido. Complete os dados gerais do restaurante.');
    }

    if (!Number.isFinite(normalizedIncomeValue) || normalizedIncomeValue <= 0) {
      throw new Error('Informe uma renda/faturamento mensal valido para criar a conta Asaas.');
    }

    if (!normalizedAddress || !normalizedAddressNumber || !normalizedProvince) {
      throw new Error(
        'Endereco, numero e bairro sao obrigatorios. Complete os dados gerais do restaurante.',
      );
    }

    if (!normalizedPostalCode) {
      throw new Error('CEP invalido. Complete os dados gerais do restaurante.');
    }

    const normalizedBirthDate = String(
      birthDate || existingSettings?.ownerBirthDate?.toISOString().slice(0, 10) || '',
    ).trim();
    if (
      legalDocumentType === 'CPF' &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedBirthDate) ||
        !Number.isFinite(Date.parse(normalizedBirthDate)) ||
        normalizedBirthDate >= new Date().toISOString().slice(0, 10))
    ) {
      throw new Error('Informe a data de nascimento do titular da conta Asaas.');
    }
    const normalizedCompanyType = String(companyType || '')
      .trim()
      .toUpperCase();
    if (
      normalizedCompanyType &&
      !['MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION'].includes(normalizedCompanyType)
    ) {
      throw new Error('Tipo de empresa inválido para o Asaas.');
    }

    const asaasApiKey = this.getAsaasApiKey();
    if (!asaasApiKey) {
      throw new Error('ASAAS_API_KEY nao configurada no backend.');
    }

    const webhook = asaasWebhookConfiguration(normalizedEmail);
    if (!existingSettings) {
      await restaurantSettingsRepository.create({
        restaurantId: normalizedRestaurantId,
        deliveryFee: 0,
        minimumOrder: 0,
      });
    }
    if (!(await restaurantSettingsRepository.claimAsaasOnboarding(normalizedRestaurantId))) {
      throw new Error(
        'A conexão Asaas já está em andamento ou precisa de conferência. Nenhuma nova subconta foi criada.',
      );
    }
    let responseBody: AsaasCreateAccountResponse;
    try {
      responseBody = await asaasRequest<AsaasCreateAccountResponse>('/accounts', asaasApiKey, {
        method: 'POST',
        body: {
          cpfCnpj: normalizedDocument,
          name: normalizedRestaurantName,
          email: normalizedEmail,
          mobilePhone: normalizedMobilePhone,
          incomeValue: Math.round(normalizedIncomeValue * 100) / 100,
          address: normalizedAddress,
          addressNumber: normalizedAddressNumber,
          province: normalizedProvince,
          postalCode: normalizedPostalCode,
          ...(legalDocumentType === 'CPF' ? { birthDate: normalizedBirthDate } : {}),
          ...(legalDocumentType === 'CNPJ' && normalizedCompanyType
            ? { companyType: normalizedCompanyType }
            : {}),
          webhooks: [webhook],
        },
      });
    } catch (error) {
      const definitiveRejection =
        error instanceof AsaasProviderError && [400, 401, 403, 422].includes(error.status);
      await restaurantSettingsRepository.update(normalizedRestaurantId, {
        asaasOnboardingState: definitiveRejection ? 'FAILED' : 'REQUIRES_RECOVERY',
      });
      if (definitiveRejection) throw error;
      throw new Error(
        'Não foi possível confirmar a criação no Asaas. A tentativa foi preservada para conferência, sem criar outra conta.',
      );
    }
    const accountId = String(responseBody.id || '').trim();
    const walletIdentifier = String(responseBody.walletId || '').trim();
    const asaasSubaccountToken = this.extractAsaasToken(responseBody);
    const complete = Boolean(accountId && walletIdentifier && asaasSubaccountToken);
    // A API key só é entregue nesta resposta: persistir antes de consultar status ou webhooks.
    await restaurantSettingsRepository.update(normalizedRestaurantId, {
      legalDocumentType,
      companyDocument: normalizedDocument,
      companyTradeName: normalizedRestaurantName,
      ...(normalizedPixKey ? { pixKey: normalizedPixKey } : {}),
      monthlyRevenue: Math.round(normalizedIncomeValue * 100) / 100,
      gatewayMerchantId: walletIdentifier || null,
      asaasAccountId: accountId || null,
      asaasOnboardingState: complete ? 'CREATED' : 'REQUIRES_RECOVERY',
      ...(asaasSubaccountToken
        ? {
            asaasAccessToken: asaasSubaccountToken,
          }
        : {}),
    });
    if (complete) {
      try {
        const webhookId = await ensureAsaasWebhook(asaasSubaccountToken, normalizedEmail);
        await restaurantSettingsRepository.update(normalizedRestaurantId, {
          asaasWebhookId: webhookId,
          asaasWebhookTokenHash: asaasWebhookTokenHash(),
        });
      } catch {
        /* Conta preservada; reconectar conclui o webhook sem outra criação. */
      }
    }
    return {
      ...(await getAsaasConnectionStatusService.execute({ restaurantId: normalizedRestaurantId })),
      reused: false,
    };
  }
}

export default new OnboardRestaurantAsaasService();
