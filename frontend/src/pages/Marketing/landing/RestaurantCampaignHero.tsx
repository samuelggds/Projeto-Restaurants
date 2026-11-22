import type { ReactNode } from 'react';
import { MessageCircle, ReceiptText } from 'lucide-react';
import './RestaurantCampaignHero.css';

const images = '/marketing-vitrines';
const commercialWhatsApp =
  'https://wa.me/5585998341876?text=Ol%C3%A1%21%20Quero%20contratar%20a%20GastroNexa%20para%20meu%20restaurante.';

export function RestaurantCampaignHero({
  showcase,
  children,
}: {
  showcase?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section id="inicio" className="gx-campaign-intro" aria-labelledby="gx-campaign-title">
      <div className="gx-campaign-cover">
        <picture className="gx-campaign-cover-photo">
          <source
            media="(max-width: 760px)"
            srcSet={`${images}/hero-restaurantes-mobile-640.webp 640w, ${images}/hero-restaurantes-mobile-1000.webp 1000w`}
            sizes="100vw"
          />
          <img
            src={`${images}/hero-restaurantes-1440.webp`}
            srcSet={`${images}/hero-restaurantes-800.webp 800w, ${images}/hero-restaurantes-1440.webp 1440w, ${images}/hero-restaurantes-1983.webp 1983w`}
            sizes="92vw"
            alt="Pizza, hambúrguer, açaí e um prato feito brasileiro."
            width="1983"
            height="793"
            fetchPriority="high"
          />
        </picture>
        <div className="gx-campaign-cover-inner">
          <div className="gx-campaign-pitch">
            <h1 id="gx-campaign-title">
              Seu restaurante,<br /><em>com a sua cara.</em>
            </h1>
            <p>
              Venda pelo seu próprio cardápio digital e acompanhe os pedidos do salão,
              da retirada e do delivery em um só painel.
            </p>
            <div className="gx-campaign-actions">
              {showcase && <a className="gx-campaign-primary" href="#vitrines">Explorar as vitrines</a>}
              <a className="gx-campaign-secondary" href={commercialWhatsApp} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} aria-hidden="true" /> Falar no WhatsApp
              </a>
            </div>
          </div>
          <div className="gx-campaign-ticket" aria-hidden="true">
            <ReceiptText size={21} />
            <div><small>Delivery · Pedido #601</small><strong>Pedido recebido!</strong></div>
          </div>
        </div>
      </div>
      {showcase}
      {children && (
        <section className="gx-campaign-contact" id="contato" aria-labelledby="gx-contact-heading">
          <div className="gx-campaign-contact-layout">
            <div className="gx-campaign-contact-story">
              <img
                src={`${images}/atendimento-balcao.webp`}
                alt=""
                loading="lazy"
                width="760"
                height="930"
              />
              <div>
                <h2 id="gx-contact-heading">Como você<br /><em>atende hoje?</em></h2>
                <p>Conte um pouco sobre a sua operação. Nossa equipe ajuda você a escolher o plano e a colocar o cardápio no ar.</p>
                <a href="#planos">Comparar os planos</a>
              </div>
            </div>
            <div className="gx-campaign-contact-form">{children}</div>
          </div>
        </section>
      )}
    </section>
  );
}
