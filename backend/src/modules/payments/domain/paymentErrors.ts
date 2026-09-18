export class CardPaymentDeclinedError extends Error {
  constructor(message = 'O cartão não foi autorizado. Revise os dados ou use outro cartão.') {
    super(message);
    this.name = 'CardPaymentDeclinedError';
  }
}

export class CardPaymentProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly providerStatus: number,
    public readonly providerCode: string,
  ) {
    super(message);
    this.name = 'CardPaymentProviderRequestError';
  }
}

export class PaymentSplitConfigurationError extends Error {
  constructor(message = 'A divisão do pagamento não está configurada para este provedor.') {
    super(message);
    this.name = 'PaymentSplitConfigurationError';
  }
}
