import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

function getOrderActorKey(req: Request) {
  const orderId = String(req.params.id || "").trim().slice(0, 32);
  const userId = String(req.user?.id || "anonymous").slice(0, 32);
  const ip = ipKeyGenerator(String(req.ip || "unknown").trim());

  return `${ip}:${userId}:${orderId || "no-order"}`;
}

export const paymentPinAttemptRateLimitMiddleware = rateLimit({
  windowMs: Number(
    process.env.PAYMENT_PIN_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000,
  ),
  max: Number(process.env.PAYMENT_PIN_RATE_LIMIT_MAX_REQUESTS || 8),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: getOrderActorKey,
  message: {
    error: "Muitas tentativas de PIN para este pedido. Aguarde alguns minutos.",
  },
});

export const paymentPinRequestRateLimitMiddleware = rateLimit({
  windowMs: Number(
    process.env.PAYMENT_PIN_REQUEST_RATE_LIMIT_WINDOW_MS || 60 * 1000,
  ),
  max: Number(process.env.PAYMENT_PIN_REQUEST_RATE_LIMIT_MAX_REQUESTS || 3),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getOrderActorKey,
  message: {
    error: "Muitas solicitações de PIN para este pedido. Aguarde um instante.",
  },
});
