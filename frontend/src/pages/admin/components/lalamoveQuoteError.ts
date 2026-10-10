const SAFE_ERRORS = new Set([
  'Somente o ADMIN do restaurante pode consultar fretes.',
  'Pedido indisponível para cotação de frete parceiro.',
  'Restaurante indisponível.',
  'Endereço incompleto para cotação.',
  'Conexão sandbox Lalamove não validada.',
  'Geocodificação não configurada no servidor. Contate o suporte.',
  'Confirme os endereços no mapa antes de consultar o frete.',
  'Cotação térmica indisponível. Verifique o endereço e a cobertura.',
  'Cotação concorrente. Atualize.',
  'Endereço ou conta modificados. Aguarde a cotação expirar.',
  'Pedido ou conta alterados durante a cotação.',
  'Valor, validade ou versão da cotação divergente. Consulte novamente.',
]);
export function safeQuoteError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: unknown } } }).response;
    const message = response?.data?.error;
    if (typeof message === 'string' && SAFE_ERRORS.has(message)) return message;
  }
  return 'Não foi possível consultar a cotação Lalamove. Tente novamente ou contate o suporte.';
}
