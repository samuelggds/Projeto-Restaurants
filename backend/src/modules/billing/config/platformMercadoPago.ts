export function getPlatformMercadoPagoAccessToken() {
  return String(
    process.env.PLATFORM_MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || "",
  ).trim();
}

export function requirePlatformMercadoPagoAccessToken() {
  const accessToken = getPlatformMercadoPagoAccessToken();

  if (!accessToken) {
    throw new Error(
      "Mercado Pago da plataforma não configurado. Defina PLATFORM_MP_ACCESS_TOKEN no backend.",
    );
  }

  return accessToken;
}
