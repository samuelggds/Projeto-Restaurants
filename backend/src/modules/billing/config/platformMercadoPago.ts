export function getPlatformMercadoPagoAccessToken() {
  const dedicatedToken = String(process.env.PLATFORM_MP_ACCESS_TOKEN || '').trim();
  if (dedicatedToken) return dedicatedToken;

  // Compatibilidade apenas para desenvolvimento/testes locais. Em produção,
  // a mensalidade nunca deve reutilizar credenciais de pagamentos dos restaurantes.
  if (process.env.NODE_ENV !== 'production') {
    return String(process.env.MP_ACCESS_TOKEN || '').trim();
  }

  return '';
}

export function requirePlatformMercadoPagoAccessToken() {
  const accessToken = getPlatformMercadoPagoAccessToken();

  if (!accessToken) {
    throw new Error(
      'Mercado Pago da plataforma não configurado. Defina PLATFORM_MP_ACCESS_TOKEN no backend.',
    );
  }

  return accessToken;
}
