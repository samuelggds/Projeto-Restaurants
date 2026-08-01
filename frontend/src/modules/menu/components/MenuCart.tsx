import type { MenuCartItem, MenuRestaurant } from "../types/menu.types";

type MenuCartProps = {
  open: boolean;
  restaurant: MenuRestaurant;
  items: MenuCartItem[];
  subtotal: number;
  onClose: () => void;
  onQuantity: (id: string, quantity: number) => void;
  onCheckout: () => void;
};

export function MenuCart({
  open,
  restaurant,
  items,
  subtotal,
  onClose,
  onQuantity,
  onCheckout,
}: MenuCartProps) {
  const total = subtotal + (items.length ? restaurant.deliveryFee : 0);
  const missingMinimum = Math.max(restaurant.minimumOrder - subtotal, 0);

  return (
    <>
      <button
        className={`menu-cart-overlay ${open ? "show" : ""}`}
        type="button"
        onClick={onClose}
        aria-label="Fechar carrinho"
      />
      <aside className={`menu-cart ${open ? "open" : ""}`}>
        <header>
          <div>
            <span>Seu pedido em</span>
            <h2>{restaurant.name}</h2>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="menu-cart__content">
          {items.length ? (
            items.map((item) => (
              <article className="menu-cart-item" key={item.id}>
                <img src={item.product.image} alt="" />
                <div>
                  <strong>{item.product.name}</strong>
                  {!!item.selectedOptions.length && (
                    <small>
                      {item.selectedOptions.map((o) => o.name).join(", ")}
                    </small>
                  )}
                  {item.notes && <small>Obs.: {item.notes}</small>}
                  <span>
                    {(item.unitPrice * item.quantity).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                  <div className="menu-cart-item__quantity">
                    <button
                      type="button"
                      onClick={() => onQuantity(item.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <b>{item.quantity}</b>
                    <button
                      type="button"
                      onClick={() => onQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="menu-cart__empty">
              <span aria-hidden="true">🛍️</span>
              <strong>Seu carrinho está vazio</strong>
              <p>Escolha seus favoritos no cardápio.</p>
              <button type="button" onClick={onClose}>
                Explorar cardápio
              </button>
            </div>
          )}
        </div>

        <footer>
          {missingMinimum > 0 && items.length > 0 && (
            <div className="minimum-order-alert">
              Faltam{" "}
              {missingMinimum.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}{" "}
              para o pedido mínimo.
            </div>
          )}
          <div>
            <span>Subtotal</span>
            <strong>
              {subtotal.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </div>
          <div>
            <span>Entrega</span>
            <strong>
              {items.length
                ? restaurant.deliveryFee.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })
                : "—"}
            </strong>
          </div>
          <div className="menu-cart__total">
            <span>Total</span>
            <strong>
              {total.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </div>
          <button
            className="checkout-button"
            type="button"
            disabled={!items.length || missingMinimum > 0}
            onClick={onCheckout}
          >
            Continuar pedido
          </button>
          <small>Pagamento seguro via Pix ou cartão</small>
        </footer>
      </aside>
    </>
  );
}
