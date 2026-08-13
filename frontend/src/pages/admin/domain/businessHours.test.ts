import { describe, expect, it } from "vitest";
import { defaultBusinessHours } from "../data";
import { getTodayBusinessHours, isRestaurantOpenForOrders, isRestaurantOpenNow, normalizeBusinessHours, validateBusinessHours } from "./businessHours";
describe("businessHours", () => {
  it("mantém o restaurante aberto por padrão e respeita o fechamento manual", () => {
    expect(isRestaurantOpenForOrders(undefined)).toBe(true);
    expect(isRestaurantOpenForOrders(true)).toBe(true);
    expect(isRestaurantOpenForOrders(false)).toBe(false);
  });
  it("normaliza a agenda persistida", () => expect(normalizeBusinessHours([{ id: "monday", enabled: true, openingTime: "09:00", closingTime: "20:00" }], defaultBusinessHours)[0]).toMatchObject({ openingTime: "09:00", closingTime: "20:00" }));
  it("não aceita fechamento anterior à abertura", () => expect(validateBusinessHours([{ ...defaultBusinessHours[0], openingTime: "23:00", closingTime: "11:00" }])).toHaveProperty("monday"));
  it("gera o horário de hoje", () => expect(getTodayBusinessHours(defaultBusinessHours, new Date("2026-08-10T12:00:00"))).toBe("Hoje: 11:00 às 23:00"));
  it("calcula se o restaurante está aberto no horário", () => {
    expect(isRestaurantOpenNow(defaultBusinessHours, new Date("2026-08-10T12:00:00"))).toBe(true);
    expect(isRestaurantOpenNow(defaultBusinessHours, new Date("2026-08-10T09:00:00"))).toBe(false);
    expect(isRestaurantOpenNow(defaultBusinessHours, new Date("2026-08-09T12:00:00"))).toBe(false);
  });
});
