import assert from "node:assert/strict";
import test from "node:test";
import { buildPixPayload, isValidCpf, normalizePixKey, parseProviderPaymentId } from "./pixPayload.js";

test("identifica o provedor pelo prefixo do pagamento", () => {
  assert.deepEqual(parseProviderPaymentId("asaas:pay_123"), { provider: "ASAAS", rawPaymentId: "pay_123" });
  assert.deepEqual(parseProviderPaymentId("pagbank:ord_123"), { provider: "PAGBANK", rawPaymentId: "ord_123" });
});

test("valida CPF e normaliza chave Pix", () => {
  assert.equal(isValidCpf("529.982.247-25"), true);
  assert.equal(isValidCpf("111.111.111-11"), false);
  assert.equal(normalizePixKey("cliente@exemplo.com"), "cliente@exemplo.com");
});

test("gera payload Pix EMV com CRC", () => {
  const payload = buildPixPayload({ pixKey: "cliente@exemplo.com", merchantName: "North Pizza", merchantCity: "Fortaleza", amount: 39.9, txid: "PEDIDO48" });
  assert.match(payload, /^000201/);
  assert.match(payload, /6304[0-9A-F]{4}$/);
});
