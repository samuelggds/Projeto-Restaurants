import styled from 'styled-components';

type Props = {
  restaurantName: string;
  description?: string;
  primaryColor?: string;
  phone?: string;
  email?: string;
  onMenu?: () => void;
  onCoupons?: () => void;
  onHelp?: () => void;
  onSupport?: () => void;
};

export function CustomerDesktopFooter({
  restaurantName,
  description,
  primaryColor = '#e85a2b',
  phone,
  email,
  onMenu,
  onCoupons,
  onHelp,
  onSupport,
}: Props) {
  const supportLabel = phone || email || '';

  return (
    <Footer $primary={primaryColor}>
      <div className="main">
        <section className="platform">
          <div className="platform-brand">
            <span className="mark">G</span>
            <strong>GastroNexa</strong>
          </div>
          {description ? <p>{description}</p> : null}
        </section>

        <section>
          <h3>Nossos Links</h3>
          <nav>
            {onMenu ? <button type="button" onClick={onMenu}>Cardápio</button> : null}
            {onCoupons ? <button type="button" onClick={onCoupons}>Cupons Ativos</button> : null}
            {onHelp ? <button type="button" onClick={onHelp}>Perguntas Frequentes</button> : null}
          </nav>
        </section>

        <section>
          <h3>Suporte</h3>
          <nav>
            {onSupport ? <button type="button" onClick={onSupport}>Falar no Chat</button> : null}
            {onHelp ? <button type="button" onClick={onHelp}>Central de Ajuda</button> : null}
            {supportLabel ? <span>{supportLabel}</span> : null}
            <a href="/termos/">Termos de Serviço</a>
          </nav>
        </section>

        <section>
          <h3>Sua Loja Segura</h3>
          <p>
            Cada restaurante é operado diretamente por seu administrador autorizado.
          </p>
        </section>
      </div>

      <div className="divider" />

      <div className="bottom">
        <span>
          © {new Date().getFullYear()} GastroNexa{restaurantName ? ` & ${restaurantName}` : ''}. Todos os direitos reservados.
        </span>
        <span className="legal">
          <a href="/privacidade/">Privacidade</a>
          <a href="/cookies/">Cookies</a>
        </span>
      </div>
    </Footer>
  );
}

const Footer = styled.footer<{ $primary: string }>`
  min-height: 356px;
  padding: 64px max(24px, calc((100vw - 1120px) / 2));
  background: #1f1e1a;
  color: #fff;

  .main {
    width: min(1120px, 100%);
    margin: 0 auto;
    display: grid;
    grid-template-columns: 320px 146px 124px 280px;
    justify-content: space-between;
    gap: 36px;
    min-height: 116px;
  }

  section { min-width: 0; }

  .platform-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 32px;
  }

  .mark {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    display: grid;
    place-items: center;
    background: ({ $primary }) => $primary;
    color: #fff;
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 800;
  }

  .platform-brand strong {
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 800;
  }

  h3 {
    margin: 0 0 16px;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
  }

  p,
  nav button,
  nav a,
  nav span {
    margin: 0;
    color: #8d8a85;
    font-size: 12px;
    line-height: 1.75;
  }

  .platform p {
    margin-top: 16px;
    max-width: 320px;
  }

  nav {
    display: grid;
    justify-items: start;
    gap: 8px;
  }

  nav button {
    padding: 0;
    border: 0;
    background: transparent;
    text-align: left;
  }

  nav button:hover,
  nav button:focus-visible,
  nav a:hover,
  nav a:focus-visible {
    color: #fff;
  }

  nav a {
    text-decoration: none;
  }

  .divider {
    width: min(1120px, 100%);
    height: 1px;
    margin: 48px auto 0;
    background: #343330;
  }

  .bottom {
    width: min(1120px, 100%);
    margin: 44px auto 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    color: #77746f;
    font-size: 11px;
  }

  .legal {
    display: flex;
    gap: 24px;
  }

  .legal a {
    color: inherit;
    text-decoration: none;
  }

  @media (max-width: 1000px) {
    .main {
      grid-template-columns: 1.4fr 1fr 1fr;
    }

    .main section:last-child {
      display: none;
    }
  }

  @media (max-width: 760px) {
    display: none;
  }
`;
