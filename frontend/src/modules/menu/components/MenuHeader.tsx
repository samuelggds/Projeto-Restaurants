import type { MenuRestaurant } from "../types/menu.types";

type MenuHeaderProps = {
  restaurant: MenuRestaurant;
  cartCount: number;
  search: string;
  onSearch: (value: string) => void;
  onOpenCart: () => void;
};

export function MenuHeader({
  restaurant,
  cartCount,
  search,
  onSearch,
  onOpenCart,
}: MenuHeaderProps) {
  return (
    <>
      <div className="digital-menu__announcement">
        <span>Cardápio digital — faça seu pedido diretamente pela mesa</span>
      </div>
      <header className="digital-menu__header">
        <a className="digital-menu__brand" href="#top">
          <span>{restaurant.name.slice(0, 1)}</span>
          <strong>{restaurant.name}</strong>
        </a>

        <label className="digital-menu__search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="O que você quer comer hoje?"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label="Limpar busca"
            >
              ×
            </button>
          )}
        </label>

        <div className="digital-menu__header-actions">
          <button
            className="digital-menu__cart-button"
            type="button"
            onClick={onOpenCart}
          >
            <span aria-hidden="true">🛒</span>
            Carrinho
            <b>{cartCount}</b>
          </button>
        </div>
      </header>
    </>
  );
}
