import { describe, expect, it } from "vitest";
import { buildOrderSummary, buildProfileData, mapOrderStatus } from "./profileDataAdapter";

describe("profileDataAdapter", () => {
  it("traduz os status operacionais", () => {
    expect(mapOrderStatus("PREPARANDO")).toBe("preparing");
    expect(mapOrderStatus("SAIU_PARA_ENTREGA")).toBe("onTheWay");
    expect(mapOrderStatus("ENTREGUE")).toBe("delivered");
  });
  it("resume pedidos com vários itens", () => {
    expect(buildOrderSummary({ items: [{ product: { name: "Pizza" } }, { name: "Suco" }] })).toBe("Pizza + 1 item");
  });
  it("preserva a foto real do produto no histórico", () => {
    const data = buildProfileData({ user: { name: "Samuel", email: "cliente@demo.com" }, settings: null, favorites: [], avatarUrl: "", orders: [{ id: 48, status: "ENTREGUE", items: [{ product: { name: "Pizza", image: "https://cdn.test/pizza.png" } }] }] });
    expect(data.recentOrders[0]).toMatchObject({ id: "#0048", image: "https://cdn.test/pizza.png" });
  });
});
