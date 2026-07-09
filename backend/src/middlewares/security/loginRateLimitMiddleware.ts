import type { Request } from "express";
import rateLimit from "express-rate-limit";

function normalizeEmail(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, 255);
}

function getClientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (Array.isArray(forwarded) && forwarded.length) {
    return (
      String(forwarded[0] || "")
        .split(",")[0]
        ?.trim() || req.ip
    );
  }

  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || req.ip;
  }

  return req.ip;
}

const windowMs = Number(
  process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
);
const max = Number(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS || 8);

export const loginRateLimitMiddleware = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = normalizeEmail((req.body as { email?: unknown })?.email);
    const ip = String(getClientIp(req) || "unknown").trim();
    return `${ip}:${email || "no-email"}`;
  },
  message: {
    error:
      "Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.",
  },
});
