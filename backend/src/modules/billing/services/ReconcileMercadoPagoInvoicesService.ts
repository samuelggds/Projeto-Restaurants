import billingRepository, {
  type InvoiceReconciliationCandidate,
} from '../repositories/BillingRepository.js';
import processPaymentService from './ProcessPaymentService.js';
import { debug, error, info, warn } from '../utils/billingLogger.js';
import { getPlatformMercadoPagoAccessToken } from '../config/platformMercadoPago.js';
import { resolveMercadoPagoApiEndpoint } from '../../restaurantSettings/security/oauthEndpoints.js';
import {
  type MercadoPagoInvoicePayment,
  validateMercadoPagoInvoicePayment,
} from '../utils/mercadoPagoInvoicePayment.js';

type Environment = Record<string, string | undefined>;

const DEFAULT_MAX_INVOICES = 50;
const MAX_INVOICES_PER_RUN = 200;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const MIN_REQUEST_TIMEOUT_MS = 1_000;
const MAX_REQUEST_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 256 * 1024;

type MercadoPagoPaymentResponse = MercadoPagoInvoicePayment;

export function resolveReconciliationMaxInvoices(env: Environment = process.env) {
  const parsed = Number(env.MP_AUTO_RECONCILE_MAX_INVOICES || DEFAULT_MAX_INVOICES);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_INVOICES;
  }

  return Math.min(Math.floor(parsed), MAX_INVOICES_PER_RUN);
}

export function resolveReconciliationTimeoutMs(env: Environment = process.env) {
  const parsed = Number(env.MP_RECONCILE_TIMEOUT_MS || DEFAULT_REQUEST_TIMEOUT_MS);

  if (!Number.isSafeInteger(parsed)) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }

  return Math.min(Math.max(parsed, MIN_REQUEST_TIMEOUT_MS), MAX_REQUEST_TIMEOUT_MS);
}

async function discardResponseBody(response: Response) {
  try {
    await response.body?.cancel();
  } catch {
    // O corpo de erro do provedor não é necessário e nunca deve ir para logs.
  }
}

async function readLimitedJson(response: Response): Promise<MercadoPagoPaymentResponse> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    await discardResponseBody(response);
    throw new Error('MP search response exceeded the allowed size.');
  }

  if (!response.body) return {};

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_RESPONSE_BYTES) {
      try {
        await reader.cancel();
      } catch {
        // A resposta já excedeu o limite; o erro de cancelamento não é relevante.
      }
      throw new Error('MP search response exceeded the allowed size.');
    }
    chunks.push(value);
  }

  const body = Buffer.concat(chunks).toString('utf8');
  if (!body.trim()) return {};

  try {
    return JSON.parse(body) as MercadoPagoPaymentResponse;
  } catch {
    throw new Error('MP search returned invalid JSON.');
  }
}

export class ReconcileMercadoPagoInvoicesService {
  private isEnabled() {
    const enabled = String(process.env.MP_AUTO_RECONCILE_ENABLED || 'true').toLowerCase();

    return enabled !== 'false';
  }

  private getAccessToken() {
    return getPlatformMercadoPagoAccessToken();
  }

  private getApiBaseUrl() {
    return resolveMercadoPagoApiEndpoint();
  }

  private getMaxInvoices() {
    return resolveReconciliationMaxInvoices();
  }

  private async fetchExpectedPayment(
    invoice: InvoiceReconciliationCandidate,
    accessToken: string,
    apiBaseUrl: string,
  ) {
    const paymentId = String(invoice.paymentExternalId || '').trim();
    if (!paymentId) {
      throw new Error('Invoice does not have an expected Mercado Pago payment identifier.');
    }
    const paymentUrl = new URL(`${apiBaseUrl}/v1/payments/${encodeURIComponent(paymentId)}`);

    const response = await fetch(paymentUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(resolveReconciliationTimeoutMs()),
    });

    if (!response.ok) {
      await discardResponseBody(response);
      throw new Error(`MP payment lookup failed [${response.status}] for invoice ${invoice.id}`);
    }

    return readLimitedJson(response);
  }

  async execute() {
    if (!this.isEnabled()) {
      debug('MP auto reconciliation disabled');
      return;
    }

    const accessToken = this.getAccessToken();

    if (!accessToken) {
      warn('MP auto reconciliation skipped: missing PLATFORM_MP_ACCESS_TOKEN');
      return;
    }

    const apiBaseUrl = this.getApiBaseUrl();
    const invoicesToProcess = await billingRepository.claimInvoicesForReconciliation(
      this.getMaxInvoices(),
    );

    if (!invoicesToProcess.length) {
      debug('MP auto reconciliation: no pending invoices');
      return;
    }

    info('MP auto reconciliation started', {
      processingCount: invoicesToProcess.length,
    });

    const failures: Error[] = [];
    let reconciledCount = 0;

    for (const invoice of invoicesToProcess) {
      try {
        const payment = await this.fetchExpectedPayment(invoice, accessToken, apiBaseUrl);
        const validation = validateMercadoPagoInvoicePayment(invoice, payment);

        if (validation.valid === false) {
          debug('MP auto reconciliation: payment validation rejected', {
            invoiceId: invoice.id,
            reason: validation.reason,
          });
          continue;
        }

        await processPaymentService.execute({ invoiceId: invoice.id });
        reconciledCount += 1;

        info('MP auto reconciliation: invoice paid', {
          invoiceId: invoice.id,
        });
      } catch {
        failures.push(new Error('Invoice reconciliation failed.'));
        error('MP auto reconciliation failed for invoice', {
          invoiceId: invoice.id,
        });
      }
    }

    info('MP auto reconciliation finished', {
      processingCount: invoicesToProcess.length,
      reconciledCount,
      failureCount: failures.length,
    });

    if (failures.length) {
      throw new AggregateError(
        failures,
        `MP auto reconciliation finished with ${failures.length} failure(s).`,
      );
    }
  }
}

export default new ReconcileMercadoPagoInvoicesService();
