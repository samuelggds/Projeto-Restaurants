import type { SocialLink, TenantConfig } from "../types/home.types";

type FooterProps = {
  tenant: TenantConfig;
};

export function Footer({ tenant }: FooterProps) {
  return (
    <footer className="site-footer" id="contato">
      <div className="footer-brand">
        <strong>{tenant.name}</strong>
        <p>
          Boa comida, pedido simples e momentos especiais para compartilhar.
        </p>
        {tenant.socialLinks.length > 0 && (
          <div className="social-links" aria-label="Redes sociais">
            {tenant.socialLinks.map((social: SocialLink) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noreferrer"
                aria-label={social.name}
                title={social.name}
              >
                <span aria-hidden="true">{social.icon}</span>
              </a>
            ))}
          </div>
        )}
      </div>
      <div>
        <span>Contato</span>
        {tenant.phone && (
          <a
            className="footer-contact"
            href={`tel:${tenant.phone.replace(/\D/g, "")}`}
          >
            {tenant.phone}
          </a>
        )}
        {tenant.address && <p>{tenant.address}</p>}
      </div>
      <div>
        <span>Atendimento</span>
        <p>
          Todos os dias
          <br />
          das 11h às 23h
        </p>
      </div>
      <div>
        <span>Navegação</span>
        <nav className="footer-nav" aria-label="Navegação do rodapé">
          <a href="#inicio">Início</a>
          <a href="#cardapio">Cardápio</a>
          <a href="#sobre">Sobre</a>
        </nav>
      </div>
      <small className="footer-copy">
        © 2026 {tenant.name}. Todos os direitos reservados.
      </small>
    </footer>
  );
}
