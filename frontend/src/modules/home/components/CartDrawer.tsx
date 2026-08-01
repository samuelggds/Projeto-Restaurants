import { useNavigate } from "react-router-dom";
import type { CartItem } from "../types/home.types";

type CartDrawerProps = {
  open: boolean;
  items: CartItem[];
  total: number;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
  onDecrease: (id: number) => void;
};

export function CartDrawer({
  open,
  items,
  total,
  onClose,
  onAdd,
  onDecrease,
}: CartDrawerProps) {
  const navigate = useNavigate();

  return (
    <>
      <button
        className={`overlay ${open ? "show" : ""}`}
        type="button"
        onClick={onClose}
        aria-label="Fechar carrinho"
      />
      <aside className={`drawer ${open ? "open" : ""}`}>
        <header>
          <div>
            <span>Seu pedido</span>
            <h2>Carrinho</h2>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="cart-list">
          {items.length ? (
            items.map((item) => (
              <div className="cart-item" key={item.id}>
                <img
                  src={item.image || "https://via.placeholder.com/78?text=Prod"}
                  alt=""
                />
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {(item.price * item.quantity).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                  <div>
                    <button type="button" onClick={() => onDecrease(item.id)}>
                      −
                    </button>
                    <b>{item.quantity}</b>
                    <button type="button" onClick={() => onAdd(item)}>
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-cart">
              🛒
              <strong>Seu carrinho está vazio</strong>
              <p>Adicione produtos para começar.</p>
            </div>
          )}
        </div>

        <footer>
          <div>
            <span>Total</span>
            <strong>
              {total.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </div>
          <button
            type="button"
            disabled={!items.length}
            onClick={() => {
              onClose();
              navigate("/cart");
            }}
          >
            Continuar para pagamento
          </button>
          <small>Pagamento via Pix ou cartão.</small>
        </footer>
      </aside>
    </>
  );
}
