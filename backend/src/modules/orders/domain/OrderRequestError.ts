export class OrderRequestError extends Error {
  constructor(message: string, public readonly statusCode = 400, public readonly code = 'ORDER_INVALID') {
    super(message);
    this.name = 'OrderRequestError';
  }
}
