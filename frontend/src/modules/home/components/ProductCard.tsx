import type { Product } from "../types/home.types";
import { isProductUnavailable } from "../hooks/useCart";

type ProductCardProps = {
  product: Product;
  onAdd: (product: Product) => void;
};

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const unavailable = isProductUnavailable(product);

  return (
    <article className={`product-card${unavailable ? " unavailable" : ""}`}>
      <img
        src={
          product.image || "https://via.placeholder.com/400x235?text=Produto"
        }
        alt={product.name}
      />
      <div>
        <h3>{product.name}</h3>
        <p>{product.description || "Sem descrição"}</p>
        {unavailable && (
          <p className="unavailable-label">Produto indisponível</p>
        )}
        <footer>
          <strong>
            {Number(product.price || 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </strong>
          <button
            type="button"
            disabled={unavailable}
            onClick={() => !unavailable && onAdd(product)}
          >
            {unavailable ? "Indisponível" : "+ Adicionar"}
          </button>
        </footer>
      </div>
    </article>
  );
}
