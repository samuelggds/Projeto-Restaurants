import styled from 'styled-components';
import type { HomeBrand } from '../types';
import { buildWhatsAppUrl } from '../domain/publicSettings';
import { CalendarDays, MessageCircle, Phone } from 'lucide-react';

const ContactPanel = styled.section`
  margin: 20px 0;
  padding: clamp(16px, 3vw, 24px);
  background: #fff;
  border-radius: 18px;
  border: 1px solid #e5e7eb;
  h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 8px; font-size: 19px; }
  p { margin: 0 0 15px; color: #64748b; font-size: 14px; line-height: 1.5; }
  .actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .actions a {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px 16px; border-radius: 12px; font-size: 14px;
    text-decoration: none; font-weight: 700;
  }
  .whatsapp { background: var(--primary, #c95d3d); color: #fff; }
  .phone { border: 1px solid #cbd5e1; color: #374151; }
`;

export function ReservationContactCard({ brand }: { brand: HomeBrand }) {
  if (!brand.reservationsEnabled || (!brand.whatsapp && !brand.reservationPhone)) return null;
  const whatsapp = brand.whatsapp
    ? buildWhatsAppUrl(brand.whatsapp, `Olá! Gostaria de reservar uma mesa no ${brand.name}. Poderiam informar os horários disponíveis?`)
    : '';
  const digits = String(brand.reservationPhone || '').replace(/\D/gu, '');
  return (
    <ContactPanel aria-label="Reservas de mesas">
      <h2><CalendarDays size={20} aria-hidden="true" /> Quer reservar uma mesa?</h2>
      <p>Entre em contato com a equipe para consultar a disponibilidade.
        A reserva é confirmada somente pelo restaurante.</p>
      <div className="actions">
        {whatsapp && (
          <a className="whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={17} aria-hidden="true" /> Reservar pelo WhatsApp
          </a>
        )}
        {digits && (
          <a className="phone" href={`tel:${digits}`}>
            <Phone size={17} aria-hidden="true" /> Ligar para reservar
          </a>
        )}
      </div>
    </ContactPanel>
  );
}
