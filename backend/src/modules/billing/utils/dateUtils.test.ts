import test from "node:test";
import assert from "node:assert/strict";
import { addBusinessDays, addDays } from "./dateUtils.js";

test("addDays deve somar 30 dias corridos para mensalidade", () => {
  const start = new Date("2026-06-01T12:00:00.000Z");
  const dueDate = addDays(start, 30);

  assert.equal(dueDate.toISOString().slice(0, 10), "2026-07-01");
});

test("addBusinessDays deve ignorar fim de semana", () => {
  const friday = new Date("2026-07-03T12:00:00.000Z");
  const graceLimit = addBusinessDays(friday, 5);

  assert.equal(graceLimit.toISOString().slice(0, 10), "2026-07-10");
});
