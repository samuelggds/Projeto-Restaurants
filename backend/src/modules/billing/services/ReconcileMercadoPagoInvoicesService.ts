import billingRepository from "../repositories/BillingRepository.js";
import processPaymentService from "./ProcessPaymentService.js";
import { isApprovedPaymentStatus } from "../utils/webhookUtils.js";
import { debug, error, info, warn } from "../utils/billingLogger.js";

type MercadoPagoSearchResponse = {
  results?: Array<{
    id?: string | number | null;
    status?: string | null;
  }>;
};

class ReconcileMercadoPagoInvoicesService {
  private isEnabled() {
    const enabled = String(
      process.env.MP_AUTO_RECONCILE_ENABLED || "true",
    ).toLowerCase();

    return enabled !== "false";
  }

  private getAccessToken() {
    return String(process.env.MP_ACCESS_TOKEN || "").trim();
  }

  private getApiBaseUrl() {
    return String(
      process.env.MP_API_BASE_URL || "https://api.mercadopago.com",
    ).trim();
  }

  private getMaxInvoices() {
    const parsed = Number(process.env.MP_AUTO_RECONCILE_MAX_INVOICES || 50);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 50;
    }

    return Math.floor(parsed);
  }

  private async fetchLatestPaymentStatus(
    invoiceId: number,
    accessToken: string,
  ) {
    const searchUrl = new URL(`${this.getApiBaseUrl()}/v1/payments/search`);
    searchUrl.searchParams.set("external_reference", String(invoiceId));
    searchUrl.searchParams.set("sort", "date_created");
    searchUrl.searchParams.set("criteria", "desc");
    searchUrl.searchParams.set("limit", "1");

    const response = await fetch(searchUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const payload = (await response
      .json()
      .catch(() => ({}))) as MercadoPagoSearchResponse;

    if (!response.ok) {
      throw new Error(
        `MP search failed [${response.status}] for invoice ${invoiceId}`,
      );
    }

    return {
      paymentId: payload?.results?.[0]?.id || null,
      status: String(payload?.results?.[0]?.status || "").trim(),
    };
  }

  async execute() {
    if (!this.isEnabled()) {
      debug("MP auto reconciliation disabled");
      return;
    }

    const accessToken = this.getAccessToken();

    if (!accessToken) {
      warn("MP auto reconciliation skipped: missing MP_ACCESS_TOKEN");
      return;
    }

    const pendingInvoices = await billingRepository.findPendingInvoices();
    const invoicesToProcess = pendingInvoices
      .filter((invoice) => String(invoice.paymentLink || "").trim())
      .slice(0, this.getMaxInvoices());

    if (!invoicesToProcess.length) {
      debug("MP auto reconciliation: no pending invoices");
      return;
    }

    info("MP auto reconciliation started", {
      pendingCount: pendingInvoices.length,
      processingCount: invoicesToProcess.length,
    });

    for (const invoice of invoicesToProcess) {
      try {
        const payment = await this.fetchLatestPaymentStatus(
          invoice.id,
          accessToken,
        );

        if (!payment.paymentId) {
          debug("MP auto reconciliation: payment not found", {
            invoiceId: invoice.id,
          });
          continue;
        }

        if (!isApprovedPaymentStatus(payment.status)) {
          debug("MP auto reconciliation: payment not approved", {
            invoiceId: invoice.id,
            paymentId: payment.paymentId,
            status: payment.status,
          });
          continue;
        }

        await processPaymentService.execute({ invoiceId: invoice.id });

        info("MP auto reconciliation: invoice paid", {
          invoiceId: invoice.id,
          paymentId: payment.paymentId,
          status: payment.status,
        });
      } catch (err) {
        error("MP auto reconciliation failed for invoice", {
          invoiceId: invoice.id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    info("MP auto reconciliation finished");
  }
}

export default new ReconcileMercadoPagoInvoicesService();
