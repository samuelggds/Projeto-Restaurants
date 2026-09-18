export const BILLING_PAYMENT_PROVIDERS = {
  MERCADO_PAGO: 'MERCADO_PAGO',
  PAGBANK: 'PAGBANK',
  ASAAS: 'ASAAS',
} as const;

export type BillingPaymentProviderCode =
  (typeof BILLING_PAYMENT_PROVIDERS)[keyof typeof BILLING_PAYMENT_PROVIDERS];

export type BillingPaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELED'
  | 'EXPIRED';

export type CreateBillingPixInput = {
  invoiceId: number;
  restaurantId: number;
  title: string;
  description: string;
  amount: number;
  payerName: string;
  payerEmail: string;
  idempotencyKey: string;
};

export type BillingPixPayment = {
  provider: BillingPaymentProviderCode;
  externalId: string;
  status: BillingPaymentStatus;
  qrCode: string;
  qrCodeBase64: string | null;
  paymentLink: string | null;
  expiresAt: string | null;
};

export type BillingPaymentLookup = {
  provider: BillingPaymentProviderCode;
  externalId: string;
  invoiceId: number;
  status: BillingPaymentStatus;
  amountCents: number;
  currency: string;
  method: 'PIX';
};

export interface BillingPaymentProvider {
  readonly code: BillingPaymentProviderCode;
  isConfigured(): boolean;
  createPixPayment(input: CreateBillingPixInput): Promise<BillingPixPayment>;
  getPixPayment(externalId: string): Promise<BillingPaymentLookup>;
}
