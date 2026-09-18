export type OnlinePaymentMethod = 'PIX' | 'CARD';

export type ProviderPaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELED'
  | 'REFUNDED';

export interface ProviderPayment {
  externalId: string;
  status: ProviderPaymentStatus;
  amountCents: number;
  checkoutUrl: string | null;
  paymentCode: string | null;
  expiresAt: Date;
}

export interface CreateProviderPaymentInput {
  intentPublicId: string;
  amountCents: number;
  method: OnlinePaymentMethod;
  idempotencyKeyHash: string;
  expiresAt: Date;
}

export interface ProviderMutationInput {
  externalId: string;
  idempotencyKey: string;
}

export interface ProviderWebhookInput {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

export interface ValidatedPaymentWebhook {
  eventId: string;
  externalId: string;
  status: ProviderPaymentStatus;
  amountCents: number;
  occurredAt: Date;
}

/**
 * Contrato comum dos gateways de pagamento do GastroNexa.
 *
 * Os módulos de pedidos, mesa e configurações devem depender deste contrato,
 * não de SDKs ou detalhes de um provedor específico.
 */
export interface PaymentProvider {
  readonly code: string;
  createPayment(input: CreateProviderPaymentInput): Promise<ProviderPayment>;
  getPayment(externalId: string): Promise<ProviderPayment>;
  cancelPayment(input: ProviderMutationInput): Promise<ProviderPayment>;
  refundPayment(input: ProviderMutationInput): Promise<ProviderPayment>;
  validateWebhook(input: ProviderWebhookInput): Promise<ValidatedPaymentWebhook>;
}
