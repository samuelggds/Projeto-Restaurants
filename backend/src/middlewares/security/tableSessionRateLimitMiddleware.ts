import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

function getTableKey(req: Request) {
  const tableId = String((req.body as { tableId?: unknown })?.tableId || "")
    .trim()
    .slice(0, 32);
  const ip = ipKeyGenerator(String(req.ip || "unknown").trim());

  return `${ip}:${tableId || "no-table"}`;
}

export const tablePinRateLimitMiddleware = rateLimit({
  windowMs: Number(process.env.TABLE_PIN_RATE_LIMIT_WINDOW_MS || 5 * 60 * 1000),
  max: Number(process.env.TABLE_PIN_RATE_LIMIT_MAX_REQUESTS || 10),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: getTableKey,
  message: {
    error: "Muitas tentativas de PIN. Aguarde alguns minutos.",
  },
});

export const tablePinAssistanceRateLimitMiddleware = rateLimit({
  windowMs: Number(
    process.env.TABLE_PIN_ASSISTANCE_RATE_LIMIT_WINDOW_MS || 60 * 1000,
  ),
  max: Number(process.env.TABLE_PIN_ASSISTANCE_RATE_LIMIT_MAX_REQUESTS || 3),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getTableKey,
  message: {
    error: "Muitas solicitações de ajuda. Aguarde um instante.",
  },
});
