export function getMercadoPagoMarketplacePublicKey() {
  const publicKey = String(
    process.env.MERCADO_PAGO_PUBLIC_KEY || process.env.MP_PUBLIC_KEY || '',
  ).trim();

  if (!publicKey) {
    throw new Error('Pagamento com cartão indisponível no momento.');
  }

  return publicKey;
}
