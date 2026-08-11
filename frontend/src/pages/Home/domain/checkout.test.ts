import { describe, expect, it } from "vitest";
import { buildOrderPayload, resolveOrderType, validateCheckout } from "./checkout";

const address = { address: "Rua A", number: "123A", district: "Centro", city: "Fortaleza", state: "ce", zipCode: "60000-000", complement: "" };

describe("checkout", () => {
  it("resolve o canal do pedido", () => {
    expect(resolveOrderType(true, "delivery")).toBe("MESA");
    expect(resolveOrderType(false, "delivery")).toBe("DELIVERY");
    expect(resolveOrderType(false, "pickup")).toBe("RETIRADA");
  });

  it("exige endereço completo no delivery", () => {
    expect(validateCheckout({ type: "DELIVERY", customerPhone: "85999999999", deliveryAddress: { ...address, city: "" }, cepStatus: "success", paymentMethod: "pix" })?.title).toBe("Revise seu endereço");
  });

  it("impede pagamento na entrega para retirada", () => {
    expect(validateCheckout({ type: "RETIRADA", customerPhone: "", deliveryAddress: address, cepStatus: "idle", paymentMethod: "delivery_card" })?.title).toBe("Opção indisponível");
  });

  it("monta e normaliza o pedido", () => {
    const result = buildOrderPayload({ restaurantId: 7, type: "DELIVERY", paymentMethod: "delivery_pix", cart: [{ productId: "12", name: "Pizza", price: 39.9, quantity: 2, image: "" }], customer: { name: "Samuel" }, deliveryAddress: address });
    expect(result).toMatchObject({ payOnDelivery: true, resolvedPaymentMethod: "PIX", payload: { state: "CE", items: [{ productId: 12, quantity: 2 }] } });
  });
});
