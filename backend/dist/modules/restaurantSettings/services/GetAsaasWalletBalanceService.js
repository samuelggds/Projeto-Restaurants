import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";
class GetAsaasWalletBalanceService {
    getAsaasBaseUrl() {
        return String(process.env.ASAAS_API_BASE_URL || "https://api.asaas.com")
            .trim()
            .replace(/\/+$/, "");
    }
    extractProviderError(payload) {
        if (!Array.isArray(payload?.errors) || payload.errors.length === 0) {
            return "Falha ao consultar saldo no Asaas.";
        }
        const firstError = String(payload.errors[0]?.description || "").trim();
        return firstError || "Falha ao consultar saldo no Asaas.";
    }
    async execute({ restaurantId }) {
        const normalizedRestaurantId = Number(restaurantId);
        if (!Number.isInteger(normalizedRestaurantId) ||
            normalizedRestaurantId <= 0) {
            throw new Error("Restaurante invalido para consultar carteira Asaas.");
        }
        const settings = await restaurantSettingsRepository.findByRestaurantId(normalizedRestaurantId);
        const asaasToken = String(settings?.asaasAccessToken || "").trim();
        if (!asaasToken) {
            throw new Error("Conta Asaas ainda nao vinculada. Finalize o onboarding para consultar saldo.");
        }
        const asaasBaseUrl = this.getAsaasBaseUrl();
        const response = await fetch(`${asaasBaseUrl}/v3/finance/balance`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                access_token: asaasToken,
            },
        });
        const responseBody = (await response.json());
        if (!response.ok) {
            throw new Error(this.extractProviderError(responseBody));
        }
        const balance = Number(responseBody?.balance || 0);
        const blockedBalance = Number(responseBody?.blockedBalance || 0);
        const pendingBalance = Number(responseBody?.pendingBalance || 0);
        return {
            balance: Number.isFinite(balance) ? balance : 0,
            blockedBalance: Number.isFinite(blockedBalance) ? blockedBalance : 0,
            pendingBalance: Number.isFinite(pendingBalance) ? pendingBalance : 0,
        };
    }
}
export default new GetAsaasWalletBalanceService();
