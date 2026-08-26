import type { TablePaymentMethod } from '../domain/tableAccountContracts.js';

export type ProviderPaymentStatus =
  'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELED' | 'REFUNDED';

export interface ProviderPayment {
  externalId: string;
  status: ProviderPaymentStatus;
  amountCents: number;
  checkoutUrl: string | null;
  expiresAt: Date;
}

export interface CreateProviderPaymentInput {
  intentPublicId: string;
  amountCents: number;
  method: Extract<TablePaymentMethod, 'PIX' | 'CARD'>;
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

export interface PaymentProvider {
  readonly code: string;
  createPayment(input: CreateProviderPaymentInput): Promise<ProviderPayment>;
  getPayment(externalId: string): Promise<ProviderPayment>;
  cancelPayment(input: ProviderMutationInput): Promise<ProviderPayment>;
  refundPayment(input: ProviderMutationInput): Promise<ProviderPayment>;
  validateWebhook(input: ProviderWebhookInput): Promise<ValidatedPaymentWebhook>;
}
