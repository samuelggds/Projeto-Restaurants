import { describe, expect, it } from "vitest";

import { buildPixPayload } from "./pixPayload";

describe("buildPixPayload", () => {
  it("returns an empty payload when the Pix key is missing", () => {
    expect(buildPixPayload()).toBe("");
  });

  it("normalizes a Brazilian phone key and includes the amount", () => {
    const payload = buildPixPayload({
      pixKey: "(11) 99999-9999",
      amount: 25.5,
      merchantName: "Peça Já Food",
      merchantCity: "São Paulo",
      txid: "pedido-123",
    });

    expect(payload).toContain("+5511999999999");
    expect(payload).toContain("540525.50");
    expect(payload).toContain("PECA JA FOOD");
    expect(payload).toContain("SAO PAULO");
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);
  });

  it("normalizes an email key", () => {
    const payload = buildPixPayload({ pixKey: " Financeiro@Exemplo.COM " });

    expect(payload).toContain("financeiro@exemplo.com");
  });
});
