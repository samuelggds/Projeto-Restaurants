export const FUTURE_PAYMENT_PROVIDERS_MESSAGE =
  'Asaas e Pagar.me estão preparados para integração futura, mas permanecem indisponíveis até a liberação do cadastro empresarial/CNPJ.';

export function futurePaymentProvidersEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return String(env.ENABLE_FUTURE_PAYMENT_PROVIDERS || 'false').trim().toLowerCase() === 'true';
}

export function assertFuturePaymentProviderEnabled(provider: 'ASAAS' | 'PAGARME') {
  if (!futurePaymentProvidersEnabled()) {
    throw new Error(
      `${provider === 'ASAAS' ? 'Asaas' : 'Pagar.me'} temporariamente indisponível. A integração será liberada após o cadastro empresarial/CNPJ.`,
    );
  }
}
