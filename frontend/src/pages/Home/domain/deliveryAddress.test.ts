import { describe, expect, it } from "vitest";
import { createDeliveryAddress, formatCep } from "./deliveryAddress";

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
});
