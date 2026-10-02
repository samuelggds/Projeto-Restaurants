const DEFINITIVE_PROVIDER_ERROR_NAMES = new Set([
  'CardPaymentDeclinedError',
  'CardPaymentProviderRequestError',
]);

export function shouldReleaseTablePaymentReservationAfterProviderError(
  providerResolved: boolean,
  error: unknown,
) {
  if (!providerResolved) return true;
  const name = error instanceof Error ? error.name : '';
  return DEFINITIVE_PROVIDER_ERROR_NAMES.has(name);
}

export function safeTablePaymentProviderError(
  providerResolved: boolean,
  error: unknown,
) {
  const name = error instanceof Error ? error.name : '';

  if (name === 'CardPaymentDeclinedError' && error instanceof Error && error.message) {
    return {
      statusCode: 422,
      code: 'CARD_PAYMENT_DECLINED',
      message: error.message,
    };
  }

  if (name === 'CardPaymentProviderRequestError') {
    return {
      statusCode: 422,
      code: 'CARD_PAYMENT_INVALID',
      message: 'Não foi possível processar os dados do cartão. Revise os dados e tente novamente.',
    };
  }

  if (!providerResolved) {
    return {
      statusCode: 503,
      code: 'PAYMENT_PROVIDER_NOT_READY',
      message: 'Este método de pagamento não está disponível no momento.',
    };
  }

  return {
    statusCode: 502,
    code: 'PAYMENT_PROVIDER_CONFIRMATION_UNKNOWN',
    message:
      'Não foi possível confirmar a resposta do provedor. Tente novamente; a mesma tentativa será reutilizada com segurança.',
  };
}
