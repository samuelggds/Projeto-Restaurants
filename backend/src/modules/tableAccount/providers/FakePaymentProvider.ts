import { timingSafeEqual } from 'node:crypto';
import { assertMoneyCents } from '../domain/tableAccountRules.js';
import type {
  CreateProviderPaymentInput,
  PaymentProvider,
  ProviderMutationInput,
  ProviderPayment,
  ProviderPaymentStatus,
  ProviderWebhookInput,
  ValidatedPaymentWebhook,
} from './PaymentProvider.js';

interface FakeWebhookBody {
  eventId?: unknown;
  externalId?: unknown;
  status?: unknown;
  amountCents?: unknown;
  occurredAt?: unknown;
}

const WEBHOOK_STATUSES = new Set<ProviderPaymentStatus>([
  'PENDING',
  'PAID',
  'FAILED',
  'EXPIRED',
  'CANCELED',
  'REFUNDED',
]);

function safeSecretMatches(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export class FakePaymentProvider implements PaymentProvider {
  readonly code = 'FAKE_TABLE';
  private readonly payments = new Map<string, ProviderPayment>();

  constructor(
    private readonly options: {
      enabled?: boolean;
      webhookSecret?: string;
    } = {},
  ) {}

  private assertEnabled() {
    const enabled =
      this.options.enabled ??
      (process.env.NODE_ENV === 'test' || String(process.env.NODE_ENV) !== 'production');

    if (!enabled || process.env.NODE_ENV === 'production') {
      throw new Error('O provedor de pagamento simulado está desativado neste ambiente.');
    }
  }

  async createPayment(input: CreateProviderPaymentInput): Promise<ProviderPayment> {
    this.assertEnabled();
    const amountCents = assertMoneyCents(input.amountCents, 'valor do pagamento');
    if (amountCents === 0) {
      throw new Error('O pagamento deve possuir valor maior que zero.');
    }

    const externalId = `fake-table:${input.intentPublicId}`;
    const existing = this.payments.get(externalId);
    if (existing) {
      if (existing.amountCents !== amountCents) {
        throw new Error('A chave do pagamento simulado já foi usada com outro valor.');
      }
      return { ...existing };
    }

    const payment: ProviderPayment = {
      externalId,
      status: 'PENDING',
      amountCents,
      checkoutUrl: `/pagamentos/mesa/simulado/${encodeURIComponent(externalId)}`,
      paymentCode:
        input.method === 'PIX'
          ? `000201FAKE-TABLE-${input.intentPublicId}-${String(amountCents)}`
          : null,
      expiresAt: new Date(input.expiresAt),
    };
    this.payments.set(externalId, payment);
    return { ...payment };
  }

  async getPayment(externalId: string) {
    this.assertEnabled();
    const payment = this.payments.get(externalId);
    if (!payment) {
      throw new Error('Pagamento simulado não encontrado.');
    }
    return { ...payment };
  }

  async cancelPayment(input: ProviderMutationInput) {
    return this.changeStatus(input.externalId, 'CANCELED');
  }

  async refundPayment(input: ProviderMutationInput) {
    return this.changeStatus(input.externalId, 'REFUNDED');
  }

  /**
   * Simula a confirmacao que, em producao, chegaria assinada pelo webhook do
   * provedor real. Disponivel apenas para o fluxo local de desenvolvimento.
   */
  async simulatePaidWebhook(
    externalId: string,
    occurredAt = new Date(),
  ): Promise<ValidatedPaymentWebhook> {
    this.assertEnabled();
    const payment = await this.changeStatus(externalId, 'PAID');
    return {
      eventId: `fake-table-paid:${externalId}`,
      externalId,
      status: 'PAID',
      amountCents: payment.amountCents,
      occurredAt,
    };
  }

  private async changeStatus(externalId: string, status: ProviderPaymentStatus) {
    this.assertEnabled();
    const current = await this.getPayment(externalId);
    const updated = { ...current, status };
    this.payments.set(externalId, updated);
    return { ...updated };
  }

  async validateWebhook(input: ProviderWebhookInput): Promise<ValidatedPaymentWebhook> {
    this.assertEnabled();
    const expectedSecret = String(
      this.options.webhookSecret || process.env.FAKE_TABLE_PAYMENT_WEBHOOK_SECRET || '',
    ).trim();
    const receivedSecret = String(input.headers['x-fake-table-payment-secret'] || '').trim();

    if (!expectedSecret || !safeSecretMatches(receivedSecret, expectedSecret)) {
      throw new Error('Assinatura do webhook simulado inválida.');
    }

    const body = (input.body || {}) as FakeWebhookBody;
    const eventId = String(body.eventId || '').trim();
    const externalId = String(body.externalId || '').trim();
    const status = String(body.status || '')
      .trim()
      .toUpperCase() as ProviderPaymentStatus;
    const amountCents = Number(body.amountCents);
    const occurredAt = new Date(String(body.occurredAt || ''));

    if (
      !eventId ||
      !externalId ||
      !WEBHOOK_STATUSES.has(status) ||
      !Number.isSafeInteger(amountCents) ||
      amountCents < 0 ||
      !Number.isFinite(occurredAt.getTime())
    ) {
      throw new Error('Evento do webhook simulado inválido.');
    }

    const payment = await this.getPayment(externalId);
    if (payment.amountCents !== amountCents) {
      throw new Error('O valor do evento não corresponde ao pagamento simulado.');
    }

    this.payments.set(externalId, { ...payment, status });
    return { eventId, externalId, status, amountCents, occurredAt };
  }
}

export default new FakePaymentProvider();
