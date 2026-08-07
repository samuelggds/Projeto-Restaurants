import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  hashPaymentConfirmationPin,
  verifyPaymentConfirmationPin,
} from "./paymentConfirmationPin.js";

const originalSecret = process.env.PAYMENT_PIN_SECRET;

afterEach(() => {
  process.env.PAYMENT_PIN_SECRET = originalSecret;
});

test("protege e valida o PIN sem armazenar o valor original", () => {
  process.env.PAYMENT_PIN_SECRET = "test-secret-with-more-than-32-characters";

  const hash = hashPaymentConfirmationPin("4821");

  assert.notEqual(hash, "4821");
  assert.match(hash, /^hmac:v1:[a-f0-9]{64}$/);
  assert.equal(verifyPaymentConfirmationPin("4821", hash), true);
  assert.equal(verifyPaymentConfirmationPin("4822", hash), false);
});

test("aceita temporariamente PIN legado em texto puro", () => {
  assert.equal(verifyPaymentConfirmationPin("1234", "1234"), true);
  assert.equal(verifyPaymentConfirmationPin("1235", "1234"), false);
});
