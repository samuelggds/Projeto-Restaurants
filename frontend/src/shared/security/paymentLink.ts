const CHECKOUT_HOSTS = new Set([
  'www.mercadopago.com.br',
  'mercadopago.com.br',
  'www.mercadopago.com',
  'mercadopago.com',
]);

export function isValidPaymentLink(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 4096) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      CHECKOUT_HOSTS.has(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.pathname.startsWith('/checkout/') &&
      Boolean(url.searchParams.get('pref_id'))
    );
  } catch {
    return false;
  }
}
