import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";

type WithdrawAsaasWalletPayload = {
  restaurantId: number | string;
  value: number;
  pixKey?: string;
  description?: string;
};

type AsaasErrorItem = {
  description?: string;
};

type AsaasTransferResponse = {
  id?: string;
  value?: number;
  status?: string;
  operationType?: string;
  dateCreated?: string;
  errors?: AsaasErrorItem[];
};

class WithdrawAsaasWalletService {
  private getAsaasBaseUrl() {
    return String(process.env.ASAAS_API_BASE_URL || "https://api.asaas.com")
      .trim()
      .replace(/\/+$/, "");
  }

  private extractProviderError(payload: AsaasTransferResponse) {
    if (!Array.isArray(payload?.errors) || payload.errors.length === 0) {
      return "Falha ao solicitar saque no Asaas.";
    }

    const firstError = String(payload.errors[0]?.description || "").trim();
    return firstError || "Falha ao solicitar saque no Asaas.";
  }

  async execute({
    restaurantId,
    value,
    pixKey,
    description,
  }: WithdrawAsaasWalletPayload) {
    const normalizedRestaurantId = Number(restaurantId);
    if (
      !Number.isInteger(normalizedRestaurantId) ||
      normalizedRestaurantId <= 0
    ) {
      throw new Error("Restaurante invalido para saque Asaas.");
    }

    const normalizedValue = Number(value);
    if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      throw new Error("Valor de saque invalido.");
    }

    const settings = await restaurantSettingsRepository.findByRestaurantId(
      normalizedRestaurantId,
    );

    const asaasToken = String(settings?.asaasAccessToken || "").trim();
    if (!asaasToken) {
      throw new Error(
        "Conta Asaas ainda nao vinculada. Finalize o onboarding para sacar.",
      );
    }

    const targetPixKey = String(pixKey || settings?.pixKey || "").trim();
    if (!targetPixKey) {
      throw new Error("Chave PIX obrigatoria para saque.");
    }

    const transferDescription = String(description || "Saque carteira Asaas")
      .trim()
      .slice(0, 150);

    const asaasBaseUrl = this.getAsaasBaseUrl();
    const response = await fetch(`${asaasBaseUrl}/v3/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: asaasToken,
      },
      body: JSON.stringify({
        value: Number(normalizedValue.toFixed(2)),
        operationType: "PIX",
        pixAddressKey: targetPixKey,
        description: transferDescription,
      }),
    });

    const responseBody = (await response.json()) as AsaasTransferResponse;
    if (!response.ok) {
      throw new Error(this.extractProviderError(responseBody));
    }

    return {
      transferId: String(responseBody?.id || ""),
      status: String(responseBody?.status || "PENDING"),
      value: Number(responseBody?.value || normalizedValue),
      operationType: String(responseBody?.operationType || "PIX"),
      dateCreated: String(responseBody?.dateCreated || ""),
      pixKey: targetPixKey,
    };
  }
}

export default new WithdrawAsaasWalletService();
