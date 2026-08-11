import { describe, expect, it } from "vitest";
import { createDeliveryAddress, formatCep, validateDeliveryAddress } from "./deliveryAddress";

describe("deliveryAddress", () => {
  it("formata e limita o CEP a oito dígitos", () => {
    expect(formatCep("60336232")).toBe("60336-232");
    expect(formatCep("60.336-23299")).toBe("60336-232");
  });

  it("cria um endereço vazio sem usuário", () => {
    expect(createDeliveryAddress(null)).toEqual({
      address: "",
      number: "",
      district: "",
      city: "",
      state: "",
      zipCode: "",
      complement: "",
    });
  });

  it("normaliza os dados existentes do cliente", () => {
    expect(
      createDeliveryAddress({ address: "Rua A", zipCode: "60336232" }),
    ).toMatchObject({ address: "Rua A", zipCode: "60336-232" });
  });

  it("valida todos os campos obrigatórios e limites", () => {
    expect(validateDeliveryAddress(createDeliveryAddress(null))).toMatchObject({
      zipCode: expect.any(String), address: expect.any(String), number: expect.any(String),
      district: expect.any(String), city: expect.any(String), state: expect.any(String),
    });
    expect(validateDeliveryAddress({ address: "Rua A", number: "123A", district: "Centro", city: "Fortaleza", state: "CE", zipCode: "60336-232", complement: "" })).toEqual({});
  });
});
