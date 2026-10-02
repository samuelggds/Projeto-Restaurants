import type { TablePaymentMethod } from '../domain/tableAccountContracts.js';

export type ProviderPaymentStatus =
  'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELED' | 'REFUNDED';

export interface ProviderPayment {
  externalId: string;
  status: ProviderPaymentStatus;
  amountCents: number;
  checkoutUrl: string | null;
  paymentCode: string | null;
  expiresAt: Date;
}

export type TableCardPaymentPayload = {
  cardPaymentType?: 'credit' | 'debit' | null;
  cardToken?: string | null;
  cardPaymentMethodId?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  paymentMethodId?: string | null;
  holderName?: string | null;
  holderTaxId?: string | null;
  payerEmail?: string | null;
  mercadoPagoDeviceId?: string | null;
};

export interface CreateProviderPaymentInput {
  intentPublicId: string;
  amountCents: number;
  method: Extract<TablePaymentMethod, 'PIX' | 'CARD'>;
  idempotencyKeyHash: string;
  expiresAt: Date;
  cardPayment?: TableCardPaymentPayload | null;
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

export interface PaymentProvider {
  readonly code: string;
  createPayment(input: CreateProviderPaymentInput): Promise<ProviderPayment>;
  getPayment(externalId: string): Promise<ProviderPayment>;
  cancelPayment(input: ProviderMutationInput): Promise<ProviderPayment>;
  refundPayment(input: ProviderMutationInput): Promise<ProviderPayment>;
  validateWebhook(input: ProviderWebhookInput): Promise<ValidatedPaymentWebhook>;
}
