import type { MenuRestaurant } from "../types/menu.types";

type RestaurantSummaryProps = { restaurant: MenuRestaurant };

export function RestaurantSummary({ restaurant }: RestaurantSummaryProps) {
  return (
    <section className="restaurant-summary" id="top">
      <div>
        <span className="restaurant-summary__eyebrow">Cardápio digital</span>
        <h1>Escolha, personalize e peça.</h1>
        <p>
          Seus pratos favoritos preparados com cuidado e entregues onde você
          estiver.
        </p>
      </div>
      <div className="restaurant-summary__info">
        {restaurant.rating > 0 && (
          <div>
            <span>★ {restaurant.rating.toFixed(1)}</span>
            <small>Avaliação</small>
          </div>
        )}
        {restaurant.deliveryTime && (
          <div>
            <span>{restaurant.deliveryTime}</span>
            <small>Tempo médio</small>
          </div>
        )}
        {restaurant.deliveryFee >= 0 && (
          <div>
            <span>
              {restaurant.deliveryFee === 0
                ? "Grátis"
                : restaurant.deliveryFee.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
            </span>
            <small>Entrega</small>
          </div>
        )}
        <strong className={restaurant.isOpen ? "is-open" : "is-closed"}>
          {restaurant.isOpen ? "Aberto agora" : "Fechado"}
        </strong>
      </div>
    </section>
  );
}
