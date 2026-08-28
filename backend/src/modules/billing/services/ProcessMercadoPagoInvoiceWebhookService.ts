import billingRepository from '../repositories/BillingRepository.js';
import {
  type ExpectedInvoicePayment,
  type MercadoPagoInvoicePayment,
  validateMercadoPagoInvoicePayment,
} from '../utils/mercadoPagoInvoicePayment.js';
import { extractInvoiceId } from '../utils/webhookUtils.js';
import { getPlatformPaymentClient } from './MercadoPagoClient.js';
import processPaymentService from './ProcessPaymentService.js';

type Dependencies = {
  fetchPayment: (paymentId: string) => Promise<unknown>;
  findInvoice: (invoiceId: number) => Promise<ExpectedInvoicePayment | null>;
  processPayment: (invoiceId: number) => Promise<unknown>;
};

export type MercadoPagoInvoiceWebhookResult =
  | { processed: true; invoiceId: number }
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
    processPayment: async (invoiceId) => processPaymentService.execute({ invoiceId }),
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

    const validation = validateMercadoPagoInvoicePayment(invoice, payment);
    if (validation.valid === false) {
      return { processed: false, invoiceId, reason: validation.reason };
    }

    await this.dependencies.processPayment(invoiceId);
    return { processed: true, invoiceId };
  }
}

export default new ProcessMercadoPagoInvoiceWebhookService();
