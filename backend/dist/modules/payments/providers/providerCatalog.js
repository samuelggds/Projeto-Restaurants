export const PIX_PROVIDERS = {
    MERCADO_PAGO: "MERCADO_PAGO",
    ASAAS: "ASAAS",
    NUBANK: "NUBANK",
    PICPAY: "PICPAY",
};
export const CARD_PROVIDERS = {
    STRIPE: "STRIPE",
    MERCADO_PAGO: "MERCADO_PAGO",
    ASAAS: "ASAAS",
    PAGARME: "PAGARME",
    PAGBANK: "PAGBANK",
    STONE: "STONE",
    ZOOP: "ZOOP",
};
export function normalizePixProvider(value) {
    const provider = String(value || PIX_PROVIDERS.MERCADO_PAGO)
        .trim()
        .toUpperCase();
    if (Object.values(PIX_PROVIDERS).includes(provider)) {
        return provider;
    }
    return PIX_PROVIDERS.MERCADO_PAGO;
}
export function normalizeCardProvider(value) {
    const provider = String(value || CARD_PROVIDERS.MERCADO_PAGO)
        .trim()
        .toUpperCase();
    if (Object.values(CARD_PROVIDERS).includes(provider)) {
        return provider;
    }
    return CARD_PROVIDERS.MERCADO_PAGO;
}
