import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";

type OnboardRestaurantAsaasPayload = {
  restaurantId: number | string;
  cnpj?: string;
  cpf?: string;
  restaurantName: string;
  pixKey: string;
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
    return String(value || "").replace(/\D/g, "");
  }

  private resolveDocumentType(value: string) {
    if (value.length === 14) {
      return "CNPJ";
    }

    if (value.length === 11) {
      return "CPF";
    }

    return null;
  }

  private getAsaasBaseUrl() {
    return String(process.env.ASAAS_API_BASE_URL || "https://api.asaas.com")
      .trim()
      .replace(/\/+$/, "");
  }

  private getAsaasApiKey() {
    return String(process.env.ASAAS_API_KEY || "").trim();
  }

  private extractWalletIdentifier(payload: AsaasCreateAccountResponse) {
    return String(payload?.walletId || payload?.id || "").trim();
  }

  private extractAsaasToken(payload: AsaasCreateAccountResponse) {
    return String(payload?.accessToken || payload?.apiKey || "").trim();
  }

  private extractProviderError(payload: AsaasCreateAccountResponse) {
    if (!Array.isArray(payload?.errors) || payload.errors.length === 0) {
      return "Falha ao criar conta no Asaas.";
    }

    const firstError = String(payload.errors[0]?.description || "").trim();
    return firstError || "Falha ao criar conta no Asaas.";
  }

  async execute({
    restaurantId,
    cnpj,
    cpf,
    restaurantName,
    pixKey,
  }: OnboardRestaurantAsaasPayload) {
    const normalizedRestaurantId = Number(restaurantId);
    if (
      !Number.isInteger(normalizedRestaurantId) ||
      normalizedRestaurantId <= 0
    ) {
      throw new Error("Restaurante invalido para onboarding Asaas.");
    }

    const normalizedCnpj = this.normalizeDocument(cnpj || "");
    const normalizedCpf = this.normalizeDocument(cpf || "");

    if (normalizedCnpj && normalizedCpf && normalizedCnpj !== normalizedCpf) {
      throw new Error("Informe apenas um documento valido: CPF ou CNPJ.");
    }

    const normalizedDocument = normalizedCnpj || normalizedCpf;
    const legalDocumentType = this.resolveDocumentType(normalizedDocument);
    const normalizedRestaurantName = String(restaurantName || "").trim();
    const normalizedPixKey = String(pixKey || "").trim();

    if (!legalDocumentType) {
      throw new Error(
        "Documento invalido. Informe CPF (11) ou CNPJ (14) digitos.",
      );
    }

    if (normalizedRestaurantName.length < 2) {
      throw new Error("Nome do restaurante invalido.");
    }

    if (!normalizedPixKey) {
      throw new Error("Chave PIX obrigatoria para onboarding Asaas.");
    }

    const asaasApiKey = this.getAsaasApiKey();
    if (!asaasApiKey) {
      throw new Error("ASAAS_API_KEY nao configurada no backend.");
    }

    const asaasBaseUrl = this.getAsaasBaseUrl();
    const response = await fetch(`${asaasBaseUrl}/v3/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: asaasApiKey,
      },
      body: JSON.stringify({
        cpfCnpj: normalizedDocument,
        name: normalizedRestaurantName,
      }),
    });

    const responseBody = (await response.json()) as AsaasCreateAccountResponse;
    if (!response.ok) {
      throw new Error(this.extractProviderError(responseBody));
    }

    const walletIdentifier = this.extractWalletIdentifier(responseBody);
    if (!walletIdentifier) {
      throw new Error(
        "Asaas nao retornou identificador da conta/carteira da subconta.",
      );
    }

    const asaasSubaccountToken = this.extractAsaasToken(responseBody);
    const existingSettings =
      await restaurantSettingsRepository.findByRestaurantId(
        normalizedRestaurantId,
      );

    if (existingSettings) {
      await restaurantSettingsRepository.update(normalizedRestaurantId, {
        legalDocumentType,
        companyDocument: normalizedDocument,
        companyTradeName: normalizedRestaurantName,
        pixProvider: "ASAAS",
        pixKey: normalizedPixKey,
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
        pixProvider: "ASAAS",
        pixKey: normalizedPixKey,
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
