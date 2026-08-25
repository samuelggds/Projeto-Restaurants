import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import { isValidCnpj, isValidCpf } from '../utils/adminSettingsValidation.js';

type OnboardRestaurantAsaasPayload = {
  restaurantId: number | string;
  cnpj?: string;
  cpf?: string;
  restaurantName: string;
  pixKey: string;
  email?: string | null;
  mobilePhone?: string | null;
  incomeValue?: number | string | null;
  address?: string | null;
  addressNumber?: string | null;
  province?: string | null;
  postalCode?: string | null;
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

  private getAsaasBaseUrl() {
    return String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com')
      .trim()
      .replace(/\/+$/, '');
  }

  private getAsaasApiKey() {
    return String(process.env.ASAAS_API_KEY || '').trim();
  }

  private extractWalletIdentifier(payload: AsaasCreateAccountResponse) {
    return String(payload?.walletId || payload?.id || '').trim();
  }

  private extractAsaasToken(payload: AsaasCreateAccountResponse) {
    return String(payload?.accessToken || payload?.apiKey || '').trim();
  }

  private extractProviderError(payload: AsaasCreateAccountResponse) {
    if (!Array.isArray(payload?.errors) || payload.errors.length === 0) {
      return 'Falha ao criar conta no Asaas.';
    }

    const firstError = String(payload.errors[0]?.description || '').trim();
    return firstError || 'Falha ao criar conta no Asaas.';
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

    const normalizedCnpj = this.normalizeDocument(
      cnpj || existingSettings?.companyDocument || restaurant.cnpj || '',
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

    if (!normalizedPixKey) {
      throw new Error('Chave PIX obrigatoria para onboarding Asaas.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
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

    const asaasApiKey = this.getAsaasApiKey();
    if (!asaasApiKey) {
      throw new Error('ASAAS_API_KEY nao configurada no backend.');
    }

    const asaasBaseUrl = this.getAsaasBaseUrl();
    const response = await fetch(`${asaasBaseUrl}/v3/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: asaasApiKey,
      },
      body: JSON.stringify({
        cpfCnpj: normalizedDocument,
        name: normalizedRestaurantName,
        email: normalizedEmail,
        mobilePhone: normalizedMobilePhone,
        incomeValue: Math.round(normalizedIncomeValue * 100) / 100,
        address: normalizedAddress,
        addressNumber: normalizedAddressNumber,
        province: normalizedProvince,
        postalCode: normalizedPostalCode,
      }),
    });

    const responseBody = (await response.json()) as AsaasCreateAccountResponse;
    if (!response.ok) {
      throw new Error(this.extractProviderError(responseBody));
    }

    const walletIdentifier = this.extractWalletIdentifier(responseBody);
    if (!walletIdentifier) {
      throw new Error('Asaas nao retornou identificador da conta/carteira da subconta.');
    }

    const asaasSubaccountToken = this.extractAsaasToken(responseBody);
    if (existingSettings) {
      await restaurantSettingsRepository.update(normalizedRestaurantId, {
        legalDocumentType,
        companyDocument: normalizedDocument,
        companyTradeName: normalizedRestaurantName,
        pixProvider: 'ASAAS',
        pixKey: normalizedPixKey,
        monthlyRevenue: Math.round(normalizedIncomeValue * 100) / 100,
        gatewayMerchantId: walletIdentifier,
        ...(asaasSubaccountToken
          ? {
              asaasAccessToken: asaasSubaccountToken,
            }
          : {}),
      });
    } else {
      await restaurantSettingsRepository.create({
        restaurantId: normalizedRestaurantId,
        deliveryFee: 0,
        minimumOrder: 0,
        pixProvider: 'ASAAS',
        pixKey: normalizedPixKey,
        monthlyRevenue: Math.round(normalizedIncomeValue * 100) / 100,
        ownerEmail: normalizedEmail,
        ownerPhone: normalizedMobilePhone,
        legalDocumentType,
        companyDocument: normalizedDocument,
        companyTradeName: normalizedRestaurantName,
        gatewayMerchantId: walletIdentifier,
        asaasAccessToken: asaasSubaccountToken || null,
      });
    }

    return {
      restaurantId: normalizedRestaurantId,
      walletId: walletIdentifier,
      pixKey: normalizedPixKey,
      asaasSubaccountTokenConfigured: Boolean(asaasSubaccountToken),
    };
  }
}

export default new OnboardRestaurantAsaasService();
