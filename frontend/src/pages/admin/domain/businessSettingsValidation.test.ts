import { describe, expect, it } from "vitest";
import { adminMockSettings } from "../data";
import { isValidCnpj, isValidCpf, validateBusinessSettings } from "./businessSettingsValidation";

describe("business settings validation", () => {
  it("valida dígitos verificadores do CNPJ", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-80")).toBe(false);
  });

  it("valida CPF quando este for o tipo escolhido", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(validateBusinessSettings({ ...adminMockSettings, legalDocumentType: "CPF", companyLegalName: "Maria da Silva", companyDocument: "529.982.247-25", businessPhone: "(85) 99999-1234", businessEmail: "contato@restaurante.com.br" })).toEqual({});
  });

  it("aceita os dados comerciais válidos", () => {
    expect(validateBusinessSettings({ ...adminMockSettings, companyLegalName: "Restaurante Exemplo LTDA", companyDocument: "11.222.333/0001-81", businessPhone: "(85) 99999-1234", businessEmail: "contato@restaurante.com.br" })).toEqual({});
  });
});
