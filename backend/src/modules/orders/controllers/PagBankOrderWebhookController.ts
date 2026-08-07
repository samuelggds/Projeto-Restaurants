import { Request, Response } from "express";
import finalizeOrderCardPaymentService from "../services/FinalizeOrderCardPaymentService.js";
import restaurantSettingsRepository from "../../restaurantSettings/repositories/RestaurantSettingsRepository.js";
import orderRepository from "../repositories/OrderRepository.js";

const APPROVED_TRANSACTION_STATUSES = new Set(["3", "4"]);

type PagBankTransactionDetails = {
  code: string;
  status: string;
  reference: string;
};

type PagBankCredentials = {
  email: string;
  token: string;
  environment: "production";
};

class PagBankWebhookError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

function normalizeEnvironment(): "production" {
  // Webhook PagBank opera somente em producao.
  return "production";
}

async function getPagBankCredentials(
  restaurantId?: number,
): Promise<PagBankCredentials> {
  const allowGlobalFallback =
    process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
  if (!restaurantId && !allowGlobalFallback) {
    throw new PagBankWebhookError(
      "Webhook PagBank sem restaurantId. Configure notificationURL com restaurantId.",
      400,
    );
  }

  const settings = restaurantId
    ? await restaurantSettingsRepository.findByRestaurantId(restaurantId)
    : null;
  const settingsEmail = String(settings?.pagbankEmail || "").trim();
  const settingsToken = String(settings?.pagbankToken || "").trim();
  const globalEmail = String(
    process.env.PAGBANK_EMAIL || process.env.PAGSEGURO_EMAIL || "",
  ).trim();
  const globalToken = String(
    process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN || "",
  ).trim();
  const email = settingsEmail || (allowGlobalFallback ? globalEmail : "");
  const token = settingsToken || (allowGlobalFallback ? globalToken : "");
  const environment = normalizeEnvironment();

  if (!email || !token) {
    throw new PagBankWebhookError(
      "Webhook PagBank indisponivel. Configure email/token PagBank nas configuracoes do restaurante.",
      503,
    );
  }

  return { email, token, environment };
}

function resolvePagBankApiBaseUrl(environment: "production") {
  void environment;
  return "https://ws.pagseguro.uol.com.br";
}

function extractXmlTagValue(xml: string, tag: string) {
  const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i");
  const match = regex.exec(String(xml || ""));

  return String(match?.[1] || "").trim();
}

async function fetchPagBankTransactionByNotificationCode(
  notificationCode: string,
  restaurantId?: number,
) {
  const { email, token, environment } =
    await getPagBankCredentials(restaurantId);
  const url = `${resolvePagBankApiBaseUrl(environment)}/v3/transactions/notifications/${encodeURIComponent(notificationCode)}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    method: "GET",
  });
  const responseText = await response.text();

  if (!response.ok) {
    const providerMessage =
      extractXmlTagValue(responseText, "message") ||
      extractXmlTagValue(responseText, "error") ||
      "Falha ao consultar notificacao no PagBank.";
    throw new PagBankWebhookError(`PagBank webhook: ${providerMessage}`, 502);
  }

  return {
    code: extractXmlTagValue(responseText, "code"),
    status: extractXmlTagValue(responseText, "status"),
    reference: extractXmlTagValue(responseText, "reference"),
  } as PagBankTransactionDetails;
}

async function fetchPagBankTransactionByCode(
  transactionCode: string,
  restaurantId?: number,
) {
  const { email, token, environment } =
    await getPagBankCredentials(restaurantId);
  const url = `${resolvePagBankApiBaseUrl(environment)}/v3/transactions/${encodeURIComponent(transactionCode)}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    method: "GET",
  });
  const responseText = await response.text();

  if (!response.ok) {
    const providerMessage =
      extractXmlTagValue(responseText, "message") ||
      extractXmlTagValue(responseText, "error") ||
      "Falha ao consultar transacao no PagBank.";
    throw new PagBankWebhookError(`PagBank webhook: ${providerMessage}`, 502);
  }

  return {
    code: extractXmlTagValue(responseText, "code"),
    status: extractXmlTagValue(responseText, "status"),
    reference: extractXmlTagValue(responseText, "reference"),
  } as PagBankTransactionDetails;
}

class PagBankOrderWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const notificationCode = String(
        req.body?.notificationCode || req.query?.notificationCode || "",
      ).trim();
      const transactionCode = String(
        req.body?.transactionCode ||
          req.body?.code ||
          req.query?.transactionCode ||
          req.query?.code ||
          "",
      ).trim();
      const restaurantIdHint =
        Number(req.body?.restaurantId || req.query?.restaurantId || 0) ||
        undefined;

      if (
        !restaurantIdHint &&
        process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK !== "true"
      ) {
        return res.status(400).json({
          error:
            "restaurantId obrigatorio no webhook PagBank para ambiente multi-tenant.",
        });
      }

      if (!notificationCode && !transactionCode) {
        return res.sendStatus(200);
      }

      const details = notificationCode
        ? await fetchPagBankTransactionByNotificationCode(
            notificationCode,
            restaurantIdHint,
          )
        : await fetchPagBankTransactionByCode(
            transactionCode,
            restaurantIdHint,
          );

      if (!APPROVED_TRANSACTION_STATUSES.has(String(details.status || ""))) {
        return res.sendStatus(200);
      }

      const externalReference = String(details.reference || "").trim();

      if (externalReference.startsWith("ordercard:")) {
        const [, orderId = "", restaurantId = ""] =
          externalReference.split(":");
        const referenceRestaurantId = Number(restaurantId || 0);

        if (
          !Number.isInteger(referenceRestaurantId) ||
          referenceRestaurantId <= 0 ||
          (restaurantIdHint && referenceRestaurantId !== restaurantIdHint)
        ) {
          return res.status(400).json({
            error:
              "Webhook PagBank rejeitado: restaurante da transação não confere.",
          });
        }

        if (orderId) {
          if (details.code) {
            await orderRepository.setCardCheckoutSessionId(
              orderId,
              referenceRestaurantId,
              `pagbank_tx:${details.code}`,
            );
          }

          await finalizeOrderCardPaymentService.execute({
            orderId,
            restaurantId: referenceRestaurantId,
            allowMissingOrder: true,
          });
        }
      }

      return res.sendStatus(200);
    } catch (error: unknown) {
      const statusCode =
        error instanceof PagBankWebhookError ? error.statusCode : 500;
      const message =
        error instanceof Error
          ? error.message
          : "Erro interno no webhook PagBank.";

      console.error("[ORDER_CARD_PAGBANK_WEBHOOK_ERROR]", message);

      return res.status(statusCode).json({ error: message });
    }
  }
}

export default new PagBankOrderWebhookController();
