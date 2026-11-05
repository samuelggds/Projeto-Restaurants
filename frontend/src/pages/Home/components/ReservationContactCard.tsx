import styled from 'styled-components';
import type { HomeBrand } from '../types';
import { buildWhatsAppUrl } from '../domain/publicSettings';
import { UtensilsCrossed, MessageCircle, Phone } from 'lucide-react';

const ContactPanel = styled.section`
  margin: 20px 0;
  padding: 20px 16px 18px;
  background: #f6f7f9;
  border: 1px solid #e6e9ee;
  border-radius: 13px;
  color: var(--delivery-text, #121b2a);
  display: grid;
  gap: 0;

  .reservation-icon {
    width: 35px;
    height: 35px;
    display: grid;
    place-items: center;
    color: #e73142;
    background: #fff;
    border-radius: 10px;
    margin-bottom: 17px;
  }
  .reservation-icon svg { width: 17px; height: 17px; stroke-width: 1.7; }
  h2 {
    margin: 0 0 9px;
    color: var(--delivery-text, #131c2c);
    font-size: 19px;
    line-height: 1.35;
    font-weight: 650;
    letter-spacing: -.025em;
  }
  .description {
    margin: 0 0 15px;
    color: #66758c;
    font-size: 12px;
    line-height: 1.85;
  }
  .actions {
    display: flex;
    gap: 10px;
    align-items: stretch;
    min-width: 0;
  }
  .actions a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 44px;
    min-width: 0;
    padding: 9px 12px;
    border-radius: 9px;
    border: 1px solid #e6e9ee;
    background: #fff;
    color: #242d3a;
    text-decoration: none;
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
  }
  .actions svg { width: 16px; height: 16px; flex: 0 0 16px; }
  .actions .whatsapp { flex: 2; color: #d82739; background: #fff; }
  .actions .phone { flex: 1; }
  .reservation-note {
    margin: 13px 0 0;
    color: #66758c;
    font-size: 11px;
    line-height: 1.6;
  }

  @media (max-width: 350px) {
    padding-inline: 12px;
    .actions { gap: 7px; }
    .actions a { padding-inline: 7px; font-size: 11px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .actions a { transition: none; }
  }
`;

export function ReservationContactCard({ brand }: { brand: HomeBrand }) {
  if (!brand.reservationsEnabled || (!brand.whatsapp && !brand.reservationPhone)) return null;
  const whatsapp = brand.whatsapp
    ? buildWhatsAppUrl(brand.whatsapp, `Olá! Gostaria de reservar uma mesa no ${brand.name}. Poderiam informar os horários disponíveis?`)
    : '';
  const digits = String(brand.reservationPhone || '').replace(/\D/gu, '');
  return (
    <ContactPanel aria-label="Reservas de mesas">
      <span className="reservation-icon"><UtensilsCrossed aria-hidden="true" /></span>
      <h2>Quer reservar uma mesa?</h2>
      <p className="description">Solicite pelo WhatsApp e aguarde a confirmação do restaurante.</p>
      <div className="actions">
        {whatsapp && (
          <a className="whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden="true" /> Solicitar pelo WhatsApp
          </a>
        )}
        {digits && (
          <a className="phone" href={`tel:${digits}`}>
            <Phone aria-hidden="true" /> Ligar
          </a>
        )}
      </div>
      <p className="reservation-note">A reserva depende de confirmação do restaurante.</p>
    </ContactPanel>
  );
}
