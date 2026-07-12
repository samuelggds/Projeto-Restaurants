import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import restaurantSettingsRepository from "../../restaurantSettings/repositories/RestaurantSettingsRepository.js";
async function getAccessToken(restaurantId) {
    const normalizedRestaurantId = Number(restaurantId || 0);
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
    const settings = Number.isInteger(normalizedRestaurantId) && normalizedRestaurantId > 0
        ? await restaurantSettingsRepository.findByRestaurantId(normalizedRestaurantId)
        : null;
    const settingsToken = String(settings?.mercadoPagoAccessToken || "").trim();
    const globalToken = String(process.env.MP_ACCESS_TOKEN || "").trim();
    const token = settingsToken || (allowGlobalFallback ? globalToken : "");
    if (!token) {
        throw new Error("Pagamento Mercado Pago indisponivel. Configure access token do Mercado Pago nas configuracoes do restaurante.");
    }
    return token;
}
export async function getMercadoPagoClient(restaurantId) {
    return new MercadoPagoConfig({
        accessToken: await getAccessToken(restaurantId),
    });
}
export async function getMercadoPagoPaymentApi(restaurantId) {
    return new Payment(await getMercadoPagoClient(restaurantId));
}
export async function getMercadoPagoPreferenceApi(restaurantId) {
    return new Preference(await getMercadoPagoClient(restaurantId));
}
