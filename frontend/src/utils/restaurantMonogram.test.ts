import { describe, expect, it } from "vitest";
import { createRestaurantMonogram } from "./restaurantMonogram";

describe("sigla do restaurante", () => {
  it("usa as iniciais das duas primeiras palavras", () => {
    expect(createRestaurantMonogram("North Pizza")).toBe("NP");
  });
  it("ignora conectores formados apenas por símbolos", () => {
    expect(createRestaurantMonogram("Sabor & Casa")).toBe("SC");
  });
  it("usa as duas primeiras letras quando existe uma palavra", () => {
    expect(createRestaurantMonogram("Pizzaria")).toBe("PI");
  });
});
