import { useMemo, useState } from "react";
import type { Category, Product } from "../types/home.types";
import { ProductCard } from "./ProductCard";

type MenuSectionProps = {
  categories: Category[];
  products: Product[];
  onAdd: (product: Product) => void;
};

export function MenuSection({ categories, products, onAdd }: MenuSectionProps) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      products.filter((product) => {
        const matchesCat =
          category === "all" || product.categoryId === category;
        const matchesSearch =
          !search.trim() ||
          `${product.name} ${product.description ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase());
        return matchesCat && matchesSearch;
      }),
    [category, products, search],
  );

  return (
    <section className="menu" id="cardapio">
      <div className="section-header">
        <div>
          <span>Nosso cardápio</span>
          <h2>Escolha o que combina com você.</h2>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar no cardápio"
        />
      </div>
      <div className="categories">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={category === cat.id ? "selected" : ""}
            type="button"
            onClick={() => setCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <div className="products">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={onAdd} />
        ))}
        {filtered.length === 0 && (
          <p
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              color: "#756f69",
              padding: "40px 0",
            }}
          >
            Nenhum produto encontrado.
          </p>
        )}
      </div>
    </section>
  );
}
