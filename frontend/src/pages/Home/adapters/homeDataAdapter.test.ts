import { describe, expect, it } from "vitest";
import { buildHomeData, resolveProductImage } from "./homeDataAdapter";

describe("homeDataAdapter", () => {
  it("preserva a imagem real do produto", () => {
    expect(resolveProductImage({ image: "https://cdn.test/pizza.webp" }, 0)).toBe("https://cdn.test/pizza.webp");
  });
  it("mantém produtos sem estoque visíveis, mas indisponíveis, e cria categorias únicas", () => {
    const data = buildHomeData([
      { id: 1, name: "Pizza A", price: 20, stock: 2, category: { name: "Pizzas" } },
      { id: 2, name: "Pizza B", price: 30, stock: 0, category: { name: "Pizzas" } },
      { id: 3, name: "Suco", price: 8, stock: null, category: { name: "Bebidas" } },
    ], null);
    expect(data.products.map((product) => product.id)).toEqual(["1", "2", "3"]);
    expect(data.products.map((product) => product.available)).toEqual([true, false, true]);
    expect(data.categories.map((category) => category.name)).toEqual(["Todos", "Pizzas", "Bebidas"]);
  });
  it("monta marca e os três banners configurados", () => {
    const data = buildHomeData([], { restaurant: { name: "North Pizza", logo: "https://cdn.test/logo.png", banners: [
      { title: "Banner principal", image: "https://cdn.test/main.png" },
      { title: "Promoção 1", image: "https://cdn.test/promo1.png" },
      { title: "Promoção 2", image: "https://cdn.test/promo2.png" },
    ] } });
    expect(data.brand).toMatchObject({ name: "North Pizza", monogram: "NP" });
    expect(data.hero.image).toContain("main.png");
    expect(data.banners).toHaveLength(0);
  });
});
