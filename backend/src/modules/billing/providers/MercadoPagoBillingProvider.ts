import { getPlatformMercadoPagoAccessToken } from '../config/platformMercadoPago.js';
import type {
  BillingPaymentLookup,
  BillingPaymentProvider,
  CreateBillingPixInput,
} from '../domain/BillingPaymentProvider.js';
import { BILLING_PAYMENT_PROVIDERS } from '../domain/BillingPaymentProvider.js';
import mercadoPagoService from '../services/MercadoPagoService.js';
import { getPlatformPaymentClient } from '../services/MercadoPagoClient.js';

function cents(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round((amount + Number.EPSILON) * 100);
}

function status(value: unknown): BillingPaymentLookup['status'] {
  const normalized = String(value || '').trim().toLowerCase();
  if (['approved', 'accredited', 'paid'].includes(normalized)) return 'PAID';
  if (['cancelled', 'canceled'].includes(normalized)) return 'CANCELED';
  if (['rejected', 'failed'].includes(normalized)) return 'FAILED';
  if (normalized === 'expired') return 'EXPIRED';
  return 'PENDING';
}

class MercadoPagoBillingProvider implements BillingPaymentProvider {
  readonly code = BILLING_PAYMENT_PROVIDERS.MERCADO_PAGO;

  isConfigured() {
    return Boolean(getPlatformMercadoPagoAccessToken());
  }

  async createPixPayment(input: CreateBillingPixInput) {
    const payment = await mercadoPagoService.createPayment({
      invoiceId: input.invoiceId,
      title: input.title,
      description: input.description,
      amount: input.amount,
      payerEmail: input.payerEmail,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      provider: this.code,
      externalId: payment.id,
      status: status(payment.status),
      qrCode: payment.qrCode,
      qrCodeBase64: payment.qrCodeBase64,
      paymentLink: payment.ticketUrl,
      expiresAt: payment.expiresAt,
    };
  }

  async getPixPayment(externalId: string): Promise<BillingPaymentLookup> {
    const normalizedId = String(externalId || '').trim();
    if (!normalizedId) throw new Error('Identificador Mercado Pago inválido.');

    const response = await getPlatformPaymentClient().get({ id: normalizedId });
    const invoiceId = Number(response.external_reference);
    if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0) {
      throw new Error('Pagamento Mercado Pago sem referência de mensalidade válida.');
    }

    return {
      provider: this.code,
      externalId: String(response.id || normalizedId),
      invoiceId,
      status: status(response.status),
      amountCents: cents(response.transaction_amount),
      currency: String(response.currency_id || '').trim().toUpperCase(),
      method: 'PIX',
    };
  }
}

export default new MercadoPagoBillingProvider();
