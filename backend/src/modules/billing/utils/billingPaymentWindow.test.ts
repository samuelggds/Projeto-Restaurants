import assert from "node:assert/strict";
import test from "node:test";
import {
  getPixAvailableAt,
  isInvoicePixAvailable,
} from "./billingPaymentWindow.js";

test("abre o Pix cinco dias antes do vencimento", () => {
  const dueDate = new Date("2026-08-20T12:00:00.000Z");
  assert.equal(getPixAvailableAt(dueDate).toISOString(), "2026-08-15T12:00:00.000Z");
  assert.equal(isInvoicePixAvailable({ status: "PENDENTE", dueDate }, new Date("2026-08-14T12:00:00.000Z")), false);
  assert.equal(isInvoicePixAvailable({ status: "PENDENTE", dueDate }, new Date("2026-08-15T12:00:00.000Z")), true);
});

test("mantém o Pix disponível durante tolerância e atraso", () => {
  const dueDate = new Date("2026-08-20T12:00:00.000Z");
  assert.equal(isInvoicePixAvailable({ status: "PENDENTE", dueDate }, new Date("2026-08-23T12:00:00.000Z")), true);
  assert.equal(isInvoicePixAvailable({ status: "ATRASADO", dueDate }, new Date("2026-09-01T12:00:00.000Z")), true);
});

test("não oferece Pix para fatura já paga", () => {
  assert.equal(isInvoicePixAvailable({ status: "PAGO", dueDate: new Date() }), false);
});
