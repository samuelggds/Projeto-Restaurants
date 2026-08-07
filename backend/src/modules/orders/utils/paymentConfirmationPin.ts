import crypto from "node:crypto";

const HASH_PREFIX = "hmac:v1:";

function getSecret() {
  const secret = String(
    process.env.PAYMENT_PIN_SECRET ||
      process.env.JWT_MFA_SECRET ||
      process.env.JWT_SECRET ||
      "development-payment-pin-secret",
  ).trim();

  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error(
      "PAYMENT_PIN_SECRET deve ter pelo menos 32 caracteres em produção.",
    );
  }

  return secret;
}

export function hashPaymentConfirmationPin(pin: string) {
  const digest = crypto
    .createHmac("sha256", getSecret())
    .update(String(pin))
    .digest("hex");

  return `${HASH_PREFIX}${digest}`;
}

export function verifyPaymentConfirmationPin(pin: string, stored: string) {
  const normalizedStored = String(stored || "");

  // Compatibilidade temporaria com PINs gerados antes da protecao HMAC.
  if (!normalizedStored.startsWith(HASH_PREFIX)) {
    const providedBuffer = Buffer.from(String(pin));
    const storedBuffer = Buffer.from(normalizedStored);

    return (
      providedBuffer.length === storedBuffer.length &&
      crypto.timingSafeEqual(providedBuffer, storedBuffer)
    );
  }

  const expected = hashPaymentConfirmationPin(pin);
  const expectedBuffer = Buffer.from(expected);
  const storedBuffer = Buffer.from(normalizedStored);

  return (
    expectedBuffer.length === storedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, storedBuffer)
  );
}
