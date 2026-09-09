/** A gateway timeout does not prove that the charge was rejected. */
export class PaymentCreationUncertainError extends Error {
  readonly code = 'PAYMENT_CREATION_UNCERTAIN';
  readonly statusCode = 502;
  constructor(
    readonly orderId: number,
    readonly orderPublicId: string,
  ) {
    super(
      'Não foi possível confirmar a criação do pagamento. O pedido foi preservado para conciliação. Consulte este pedido antes de tentar um novo pagamento.',
    );
    this.name = 'PaymentCreationUncertainError';
  }
}
