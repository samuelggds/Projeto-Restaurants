import type { Prisma } from '@prisma/client';
import billingRepository from '../repositories/BillingRepository.js';
import {
  type ExpectedInvoicePayment,
  type MercadoPagoInvoicePayment,
  validateMercadoPagoInvoicePayment,
} from '../utils/mercadoPagoInvoicePayment.js';
import { extractInvoiceId } from '../utils/webhookUtils.js';
import { getPlatformPaymentClient } from './MercadoPagoClient.js';
import processPaymentService, {
  type InvoicePaymentSettlement,
} from './ProcessPaymentService.js';
import refundDuplicateInvoicePaymentService from './RefundDuplicateInvoicePaymentService.js';

type InvoiceForWebhook = ExpectedInvoicePayment & {
  restaurantId?: number;
};

type PaymentAttemptForWebhook = {
  id: number;
  invoiceId: number;
  restaurantId: number;
  providerPaymentId: string;
  amount: Prisma.Decimal | number | string;
  status: string;
};

type Dependencies = {
  fetchPayment: (paymentId: string) => Promise<unknown>;
  findInvoice: (invoiceId: number) => Promise<InvoiceForWebhook | null>;
  findAttempt: (paymentId: string) => Promise<PaymentAttemptForWebhook | null>;
  registerAttempt: (input: {
    invoiceId: number;
    restaurantId: number;
    providerPaymentId: string;
    amount: Prisma.Decimal | number | string;
  }) => Promise<PaymentAttemptForWebhook>;
  processPayment: (
    invoiceId: number,
    paymentAttemptId: number,
  ) => Promise<{ settlement: InvoicePaymentSettlement }>;
  refundDuplicate: (paymentAttemptId: number) => Promise<unknown>;
};

export type MercadoPagoInvoiceWebhookResult =
  | { processed: true; invoiceId: number; duplicateRefunded?: true }
  | {
      processed: false;
      invoiceId?: number;
      reason: string;
    };

function unwrapPayment(value: unknown): MercadoPagoInvoicePayment {
  if (!value || typeof value !== 'object') return {};
  const record = value as Record<string, unknown>;
  const payment = record.body && typeof record.body === 'object' ? record.body : record;
  return payment as MercadoPagoInvoicePayment;
}

function defaultDependencies(): Dependencies {
  return {
    fetchPayment: async (paymentId) => getPlatformPaymentClient().get({ id: paymentId }),
    findInvoice: async (invoiceId) => billingRepository.findInvoiceById(invoiceId),
    findAttempt: async (paymentId) => billingRepository.findInvoicePaymentAttempt(paymentId),
    registerAttempt: async (input) =>
      billingRepository.registerInvoicePaymentAttempt({
        ...input,
        method: 'PIX',
        provider: 'MERCADO_PAGO',
        providerStatus: 'approved',
      }),
    processPayment: async (invoiceId, paymentAttemptId) =>
      processPaymentService.executeTracked({ invoiceId, paymentAttemptId }),
    refundDuplicate: async (paymentAttemptId) =>
      refundDuplicateInvoicePaymentService.execute(paymentAttemptId),
  };
}

export class ProcessMercadoPagoInvoiceWebhookService {
  constructor(private readonly dependencies: Dependencies = defaultDependencies()) {}

  async execute(paymentId: unknown): Promise<MercadoPagoInvoiceWebhookResult> {
    const normalizedPaymentId = String(paymentId ?? '').trim();
    if (!normalizedPaymentId) {
      return { processed: false, reason: 'MISSING_PAYMENT_ID' };
    }

    const payment = unwrapPayment(await this.dependencies.fetchPayment(normalizedPaymentId));
    const invoiceId = extractInvoiceId({}, payment as Record<string, unknown>);
    if (!invoiceId) {
      return { processed: false, reason: 'MISSING_INVOICE_REFERENCE' };
    }

    const invoice = await this.dependencies.findInvoice(invoiceId);
    if (!invoice) {
      return { processed: false, invoiceId, reason: 'INVOICE_NOT_FOUND' };
    }

    let attempt = await this.dependencies.findAttempt(normalizedPaymentId);
    if (!attempt) {
      // Backward compatibility for the payment pointer that existed before the
      // attempts migration. Never accept an unrelated ID just because the
      // external_reference names an invoice.
      if (
        String(invoice.paymentExternalId || '').trim() !== normalizedPaymentId ||
        !Number.isSafeInteger(Number(invoice.restaurantId)) ||
        Number(invoice.restaurantId) <= 0
      ) {
        return { processed: false, invoiceId, reason: 'PAYMENT_ATTEMPT_NOT_FOUND' };
      }
      attempt = await this.dependencies.registerAttempt({
        invoiceId,
        restaurantId: Number(invoice.restaurantId),
        providerPaymentId: normalizedPaymentId,
        amount: invoice.total,
      });
    }

    if (
      attempt.invoiceId !== invoiceId ||
      (invoice.restaurantId !== undefined &&
        attempt.restaurantId !== Number(invoice.restaurantId))
    ) {
      return { processed: false, invoiceId, reason: 'PAYMENT_ATTEMPT_SCOPE_MISMATCH' };
    }

    const validation = validateMercadoPagoInvoicePayment(
      {
        id: invoice.id,
        paymentExternalId: attempt.providerPaymentId,
        total: invoice.total,
      },
      payment,
    );
    if (validation.valid === false) {
      return { processed: false, invoiceId, reason: validation.reason };
    }

    const processed = await this.dependencies.processPayment(invoiceId, attempt.id);
    if (processed.settlement === 'DUPLICATE') {
      await this.dependencies.refundDuplicate(attempt.id);
      return { processed: true, invoiceId, duplicateRefunded: true };
    }

    return { processed: true, invoiceId };
  }
}

export default new ProcessMercadoPagoInvoiceWebhookService();
