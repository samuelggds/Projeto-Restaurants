export class OrderRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly code = 'ORDER_INVALID',
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'OrderRequestError';
  }
}
