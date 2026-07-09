import Stripe from "stripe";
import { PaymentMethod } from "@prisma/client";
import { getMercadoPagoPaymentApi } from "../../payments/providers/mercadoPagoClient.js";
import restaurantSettingsRepository from "../../restaurantSettings/repositories/RestaurantSettingsRepository.js";

type RefundableOrder = {
  id: number | string;
  restaurantId?: number | string | null;
  total?: number | string | { toString(): string } | null;
  paymentMethod?: PaymentMethod | string | null;
  paid?: boolean | null;
  pixPaymentId?: string | null;
  cardCheckoutSessionId?: string | null;
};

class RefundOrderPaymentService {
  private resolvePagBankEnvironment(): "production" {
    // Refund API is currently supported against production endpoint.
    return "production";
  }

  private resolvePagBankApiBaseUrl(environment: "production") {
    void environment;
    return "https://ws.pagseguro.uol.com.br";
  }

  private extractXmlTagValue(xml: string, tag: string) {
    const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i");
    const match = regex.exec(String(xml || ""));

    return String(match?.[1] || "").trim();
  }

  private parsePagBankErrorDetails(xml: string) {
    const normalizedXml = String(xml || "").trim();

    if (!normalizedXml) {
      return {
        code: "",
        message: "",
      };
    }

    const errorBlockMatch = /<error>([\s\S]*?)<\/error>/i.exec(normalizedXml);
    const errorScope = errorBlockMatch?.[1] || normalizedXml;

    const code =
      this.extractXmlTagValue(errorScope, "code") ||
      this.extractXmlTagValue(normalizedXml, "code");
    const message =
      this.extractXmlTagValue(errorScope, "message") ||
      this.extractXmlTagValue(normalizedXml, "message") ||
      this.extractXmlTagValue(errorScope, "error") ||
      this.extractXmlTagValue(normalizedXml, "error");

    return {
      code,
      message,
    };
  }

  private async getPagBankCredentials(restaurantId?: number) {
    const settings = restaurantId
      ? await restaurantSettingsRepository.findByRestaurantId(restaurantId)
      : null;

    const email = String(
      settings?.pagbankEmail ||
        process.env.PAGBANK_EMAIL ||
        process.env.PAGSEGURO_EMAIL ||
        "",
    ).trim();
    const token = String(
      settings?.pagbankToken ||
        process.env.PAGBANK_TOKEN ||
        process.env.PAGSEGURO_TOKEN ||
        "",
    ).trim();

    if (!email || !token) {
      throw new Error(
        "Credenciais PagBank nao configuradas. Nao foi possivel estornar automaticamente.",
      );
    }

    return {
      email,
      token,
      environment: this.resolvePagBankEnvironment(),
    };
  }

  private parseAmount(value: RefundableOrder["total"]) {
    const amount = Number(value || 0);
    return Number.isFinite(amount) && amount > 0
      ? Number(amount.toFixed(2))
      : undefined;
  }

  private async getMercadoPagoAccessTokenByRestaurant(
    restaurantId?: number | string | null,
  ) {
    const normalizedRestaurantId = Number(restaurantId || 0);
    const settings =
      Number.isInteger(normalizedRestaurantId) && normalizedRestaurantId > 0
        ? await restaurantSettingsRepository.findByRestaurantId(
            normalizedRestaurantId,
          )
        : null;

    const token = String(
      settings?.mercadoPagoAccessToken || process.env.MP_ACCESS_TOKEN || "",
    ).trim();

    if (!token) {
      throw new Error(
        "Credencial Mercado Pago nao configurada no restaurante. Nao foi possivel estornar automaticamente.",
      );
    }

    return token;
  }

  private async executeMercadoPagoRefund(
    paymentId: string,
    amount?: number,
    restaurantId?: number | string | null,
  ) {
    const paymentApi = (await getMercadoPagoPaymentApi(
      Number(restaurantId || 0) || undefined,
    )) as {
      refund?: (payload: Record<string, unknown>) => Promise<unknown>;
      createRefund?: (payload: Record<string, unknown>) => Promise<unknown>;
    };

    if (typeof paymentApi.refund === "function") {
      if (amount) {
        await paymentApi.refund({ id: paymentId, amount });
        return;
      }

      await paymentApi.refund({ id: paymentId });
      return;
    }

    if (typeof paymentApi.createRefund === "function") {
      if (amount) {
        await paymentApi.createRefund({ id: paymentId, amount });
        return;
      }

      await paymentApi.createRefund({ id: paymentId });
      return;
    }

    throw new Error(
      "SDK do Mercado Pago sem suporte de estorno configurado no servidor.",
    );
  }

  private async refundPix(order: RefundableOrder) {
    const paymentId = String(order.pixPaymentId || "").trim();

    if (!paymentId) {
      throw new Error(
        "Pedido PIX sem identificador de pagamento. Nao foi possivel estornar automaticamente.",
      );
    }

    if (paymentId.startsWith("manual:")) {
      throw new Error(
        "Pedido PIX manual exige estorno manual. Nao foi possivel estornar automaticamente.",
      );
    }

    const amount = this.parseAmount(order.total);

    await this.executeMercadoPagoRefund(paymentId, amount, order.restaurantId);
  }

  private async refundStripeCard(order: RefundableOrder) {
    const rawSessionId = String(order.cardCheckoutSessionId || "").trim();
    const stripeSessionId = rawSessionId;

    if (!stripeSessionId || !stripeSessionId.startsWith("cs_")) {
      throw new Error(
        "Pedido de cartao sem sessao Stripe valida para estorno automatico.",
      );
    }

    const restaurantId = Number(order.restaurantId || 0) || undefined;
    const settings = restaurantId
      ? await restaurantSettingsRepository.findByRestaurantId(restaurantId)
      : null;
    const secretKey = String(
      settings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || "",
    ).trim();
    if (!secretKey) {
      throw new Error(
        "Chave Stripe nao configurada no restaurante. Nao foi possivel estornar automaticamente.",
      );
    }

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
      expand: ["payment_intent"],
    });

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    if (!paymentIntentId) {
      throw new Error(
        "Checkout Stripe sem payment_intent para estorno automatico.",
      );
    }

    await stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
  }

  private async refundPagBankByTransaction(
    transactionCode: string,
    order: RefundableOrder,
  ) {
    const normalizedTransactionCode = String(transactionCode || "").trim();

    if (!normalizedTransactionCode) {
      throw new Error(
        "Codigo de transacao PagBank invalido para estorno automatico.",
      );
    }

    const restaurantId = Number(order.restaurantId || 0) || undefined;
    const { email, token, environment } =
      await this.getPagBankCredentials(restaurantId);
    const amount = this.parseAmount(order.total);

    const params = new URLSearchParams();
    params.set("email", email);
    params.set("token", token);
    params.set("transactionCode", normalizedTransactionCode);
    if (amount) {
      params.set("refundValue", amount.toFixed(2));
    }

    const url = `${this.resolvePagBankApiBaseUrl(environment)}/v2/transactions/cancels`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: params.toString(),
    });

    const responseText = await response.text().catch(() => "");
    const parsedError = this.parsePagBankErrorDetails(responseText);

    if (!response.ok) {
      const fallbackSnippet = String(responseText || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 220);
      const providerMessage =
        parsedError.message ||
        (fallbackSnippet
          ? `Falha ao estornar no PagBank. Resposta: ${fallbackSnippet}`
          : "Falha ao estornar no PagBank.");
      const detailsSuffix = parsedError.code
        ? ` (code ${parsedError.code})`
        : "";
      throw new Error(
        `PagBank refund [HTTP ${response.status}]: ${providerMessage}${detailsSuffix}`,
      );
    }

    // Some PagBank responses return HTTP 200 with XML error payload.
    if (parsedError.code && parsedError.message) {
      throw new Error(
        `PagBank refund [HTTP ${response.status}]: ${parsedError.message} (code ${parsedError.code})`,
      );
    }
  }

  private async refundCard(order: RefundableOrder) {
    const checkoutSessionId = String(order.cardCheckoutSessionId || "").trim();
    const amount = this.parseAmount(order.total);

    if (!checkoutSessionId) {
      throw new Error(
        "Pedido CARTAO sem identificador de checkout. Nao foi possivel estornar automaticamente.",
      );
    }

    if (checkoutSessionId.startsWith("mp_pay:")) {
      const paymentId = checkoutSessionId.replace(/^mp_pay:/i, "").trim();

      if (!paymentId) {
        throw new Error(
          "Pedido CARTAO com id de pagamento Mercado Pago invalido para estorno.",
        );
      }

      await this.executeMercadoPagoRefund(
        paymentId,
        amount,
        order.restaurantId,
      );
      return;
    }

    if (checkoutSessionId.startsWith("mp_pref:")) {
      const preferenceId = checkoutSessionId.replace(/^mp_pref:/i, "").trim();
      const orderId = Number(order.id || 0);
      const restaurantId = Number(order.restaurantId || 0);

      if (!preferenceId || !Number.isInteger(orderId) || orderId <= 0) {
        throw new Error(
          "Pedido CARTAO Mercado Pago sem dados suficientes para localizar pagamento e estornar automaticamente.",
        );
      }

      const externalReference =
        Number.isInteger(restaurantId) && restaurantId > 0
          ? `ordercard:${orderId}:${restaurantId}`
          : `ordercard:${orderId}`;
      const searchUrl = new URL(
        "https://api.mercadopago.com/v1/payments/search",
      );
      searchUrl.searchParams.set("external_reference", externalReference);
      searchUrl.searchParams.set("sort", "date_created");
      searchUrl.searchParams.set("criteria", "desc");
      searchUrl.searchParams.set("limit", "1");

      const response = await fetch(searchUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${await this.getMercadoPagoAccessTokenByRestaurant(order.restaurantId)}`,
          "Content-Type": "application/json",
        },
      });

      const payload = (await response.json().catch(() => ({}))) as {
        results?: Array<{ id?: string | number | null }>;
      };

      if (!response.ok) {
        throw new Error(
          "Falha ao consultar pagamento de cartao no Mercado Pago para estorno automatico.",
        );
      }

      const resolvedPaymentId = String(payload?.results?.[0]?.id || "").trim();

      if (!resolvedPaymentId) {
        throw new Error(
          "Nao foi possivel localizar o pagamento de cartao no Mercado Pago para estorno automatico.",
        );
      }

      await this.executeMercadoPagoRefund(
        resolvedPaymentId,
        amount,
        order.restaurantId,
      );
      return;
    }

    if (checkoutSessionId.startsWith("pagbank_chk:")) {
      throw new Error(
        "Pedido PagBank ainda sem codigo de transacao confirmado para estorno automatico. Faca o estorno manual antes de cancelar.",
      );
    }

    if (checkoutSessionId.startsWith("pagbank_tx:")) {
      const transactionCode = checkoutSessionId
        .replace(/^pagbank_tx:/i, "")
        .trim();

      await this.refundPagBankByTransaction(transactionCode, order);
      return;
    }

    await this.refundStripeCard(order);
  }

  async execute(order: RefundableOrder) {
    const paymentMethod = String(order.paymentMethod || "").toUpperCase();

    if (order.paid !== true) {
      return;
    }

    if (paymentMethod === PaymentMethod.PIX) {
      await this.refundPix(order);
      return;
    }

    if (paymentMethod === PaymentMethod.CARTAO) {
      await this.refundCard(order);
    }
  }
}

export default new RefundOrderPaymentService();
