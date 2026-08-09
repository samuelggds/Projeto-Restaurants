export const PIX_PROVIDERS = {
  MERCADO_PAGO: "MERCADO_PAGO",
  ASAAS: "ASAAS",
  PAGBANK: "PAGBANK",
  NUBANK: "NUBANK",
  PICPAY: "PICPAY",
} as const;

export type PixProvider = (typeof PIX_PROVIDERS)[keyof typeof PIX_PROVIDERS];

export const CARD_PROVIDERS = {
  STRIPE: "STRIPE",
  MERCADO_PAGO: "MERCADO_PAGO",
  ASAAS: "ASAAS",
  PAGARME: "PAGARME",
  PAGBANK: "PAGBANK",
  STONE: "STONE",
  ZOOP: "ZOOP",
} as const;

export type CardProvider = (typeof CARD_PROVIDERS)[keyof typeof CARD_PROVIDERS];

export function normalizePixProvider(value: unknown): PixProvider {
  const provider = String(value || PIX_PROVIDERS.MERCADO_PAGO)
    .trim()
    .toUpperCase();

  if (Object.values(PIX_PROVIDERS).includes(provider as PixProvider)) {
    return provider as PixProvider;
  }

  return PIX_PROVIDERS.MERCADO_PAGO;
}

export function normalizeCardProvider(value: unknown): CardProvider {
  const provider = String(value || CARD_PROVIDERS.MERCADO_PAGO)
    .trim()
    .toUpperCase();

  if (Object.values(CARD_PROVIDERS).includes(provider as CardProvider)) {
    return provider as CardProvider;
  }

  return CARD_PROVIDERS.MERCADO_PAGO;
}
