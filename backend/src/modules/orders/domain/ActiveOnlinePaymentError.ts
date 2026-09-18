import type { OrderType, PaymentMethod } from '@prisma/client';
import { OrderRequestError } from './OrderRequestError.js';

export type ActiveOnlinePaymentDetails = {
  orderId: number;
  orderPublicId: string;
  paymentMethod: PaymentMethod;
  orderType: OrderType;
  expiresAt: string;
};

export class ActiveOnlinePaymentError extends OrderRequestError {
  readonly orderId: number;
  readonly orderPublicId: string;
  readonly paymentMethod: PaymentMethod;
  readonly orderType: OrderType;
  readonly expiresAt: string;

  constructor(details: ActiveOnlinePaymentDetails) {
    super(
      'Você já possui um pagamento online pendente neste restaurante. Conclua ou aguarde a expiração antes de iniciar outro pedido.',
      409,
      'ACTIVE_PAYMENT_EXISTS',
    );
    this.name = 'ActiveOnlinePaymentError';
    this.orderId = details.orderId;
    this.orderPublicId = details.orderPublicId;
    this.paymentMethod = details.paymentMethod;
    this.orderType = details.orderType;
    this.expiresAt = details.expiresAt;
  }
}
