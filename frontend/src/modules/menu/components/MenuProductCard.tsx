import type { MenuProduct } from "../types/menu.types";

type MenuProductCardProps = {
  product: MenuProduct;
  onSelect: (product: MenuProduct) => void;
};

export function MenuProductCard({ product, onSelect }: MenuProductCardProps) {
  return (
    <article
      className={`menu-product-card ${!product.available ? "unavailable" : ""}`}
    >
      <button
        className="menu-product-card__image"
        type="button"
        onClick={() => product.available && onSelect(product)}
        disabled={!product.available}
      >
        <img src={product.image} alt={product.name} />
        {product.badge && <span>{product.badge}</span>}
        <i aria-hidden="true">♡</i>
      </button>

      <div className="menu-product-card__body">
        <div className="menu-product-card__meta">
          {product.rating > 0 && <span>★ {product.rating.toFixed(1)}</span>}
          <span>◷ {product.preparationTime}</span>
        </div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <footer>
          <div>
            <strong>
              {product.price.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </div>
          <button
            type="button"
            disabled={!product.available}
            onClick={() => onSelect(product)}
            aria-label={`Adicionar ${product.name}`}
          >
            {product.available ? "+" : "Indisponível"}
          </button>
        </footer>
      </div>
    </article>
  );
}
