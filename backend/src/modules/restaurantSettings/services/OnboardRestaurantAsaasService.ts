import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";

type OnboardRestaurantAsaasPayload = {
  restaurantId: number | string;
  cnpj: string;
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
  private normalizeCnpj(value: string) {
    return String(value || "").replace(/\D/g, "");
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

    const normalizedCnpj = this.normalizeCnpj(cnpj);
    const normalizedRestaurantName = String(restaurantName || "").trim();
    const normalizedPixKey = String(pixKey || "").trim();

    if (normalizedCnpj.length !== 14) {
      throw new Error("CNPJ invalido. Informe 14 digitos.");
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
        cpfCnpj: normalizedCnpj,
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
        companyDocument: normalizedCnpj,
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
        companyDocument: normalizedCnpj,
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
