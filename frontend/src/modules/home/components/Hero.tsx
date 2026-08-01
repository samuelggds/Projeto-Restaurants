type HeroProps = {
  restaurantName?: string;
  onLogin: () => void;
};

export function Hero({ restaurantName, onLogin }: HeroProps) {
  return (
    <section className="hero" id="inicio">
      <div className="hero-content">
        <div className="delivery-pill">◉ Entrega rápida na sua região</div>
        <h1>
          Seu pedido
          <br />
          favorito, do
          <br />
          <em>seu jeito.</em>
        </h1>
        <p>
          Escolha seus pratos preferidos, peça com facilidade e receba onde
          estiver.
        </p>
        <div className="hero-actions">
          <a className="primary-button" href="#cardapio">
            Ver cardápio <span>→</span>
          </a>
          <button className="secondary-button" type="button" onClick={onLogin}>
            Acompanhar pedido <span>→</span>
          </button>
        </div>
        <small>🔒 Para acompanhar seu pedido, é necessário fazer login.</small>
        <div className="trust">
          <span>◉ Entrega rápida</span>
          <span>★ 4,9 avaliação</span>
          <span>✓ Pagamento seguro</span>
        </div>
      </div>
      <div className="hero-image" aria-label="Mesa com pratos variados">
        <div>
          <strong>{restaurantName || "Preparado na hora"}</strong>
          <span>Ingredientes selecionados</span>
        </div>
      </div>
    </section>
  );
}
