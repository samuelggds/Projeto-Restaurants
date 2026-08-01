import { useState } from "react";
import type { MenuProduct, ProductOption } from "../types/menu.types";

type ProductModalProps = {
  product: MenuProduct | null;
  onClose: () => void;
  onAdd: (
    product: MenuProduct,
    quantity: number,
    options: ProductOption[],
    notes: string,
  ) => void;
};

export function ProductModal({ product, onClose, onAdd }: ProductModalProps) {
  const [prevProduct, setPrevProduct] = useState(product);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<ProductOption[]>([]);
  const [notes, setNotes] = useState("");

  // Reset form state when product changes (derived state — avoids effect + setState)
  if (product !== prevProduct) {
    setPrevProduct(product);
    setQuantity(1);
    setSelectedOptions([]);
    setNotes("");
  }

  if (!product) return null;

  function toggleOption(option: ProductOption) {
    setSelectedOptions((current) =>
      current.some((item) => item.id === option.id)
        ? current.filter((item) => item.id !== option.id)
        : [...current, option],
    );
  }

  const unitPrice =
    product.price +
    selectedOptions.reduce((total, opt) => total + opt.price, 0);

  return (
    <div className="product-modal-overlay" onMouseDown={onClose}>
      <section
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Personalizar ${product.name}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="product-modal__close"
          type="button"
          onClick={onClose}
        >
          ×
        </button>
        <img src={product.image} alt={product.name} />
        <div className="product-modal__content">
          <span className="product-modal__rating">
            {product.rating > 0 ? `★ ${product.rating.toFixed(1)} · ` : ""}
            {product.preparationTime}
          </span>
          <h2>{product.name}</h2>
          <p>{product.description}</p>

          {!!product.options?.length && (
            <div className="option-list">
              <header>
                <strong>Quer adicionar algo?</strong>
                <span>Opcional</span>
              </header>
              {product.options.map((option) => (
                <label key={option.id}>
                  <input
                    type="checkbox"
                    checked={selectedOptions.some(
                      (item) => item.id === option.id,
                    )}
                    onChange={() => toggleOption(option)}
                  />
                  <span>{option.name}</span>
                  <strong>
                    +{" "}
                    {option.price.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </strong>
                </label>
              ))}
            </div>
          )}

          <label className="product-notes">
            <span>Alguma observação?</span>
            <textarea
              value={notes}
              maxLength={180}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex.: sem cebola, molho à parte..."
            />
            <small>{notes.length}/180</small>
          </label>

          <div className="product-modal__footer">
            <div className="menu-quantity">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <strong>{quantity}</strong>
              <button type="button" onClick={() => setQuantity((q) => q + 1)}>
                +
              </button>
            </div>
            <button
              className="add-to-cart-button"
              type="button"
              onClick={() => {
                onAdd(product, quantity, selectedOptions, notes);
                onClose();
              }}
            >
              Adicionar{" "}
              <strong>
                {(unitPrice * quantity).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
