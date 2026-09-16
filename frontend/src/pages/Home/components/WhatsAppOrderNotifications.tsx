import { Check } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  isValidWhatsappOrderPhone,
  writeWhatsappOrderOptIn,
  writeWhatsappOrderPhone,
} from '../domain/checkout';
import { WhatsAppIcon } from './SocialBrandIcons';

type Props = {
  restaurantId?: number | null;
};

type FormState = {
  restaurantId?: number | null;
  phone: string;
  optedIn: boolean;
};

function formatWhatsappPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  const hasCountryCode = digits.length > 11 && digits.startsWith('55');
  const local = hasCountryCode ? digits.slice(2) : digits;
  const prefix = hasCountryCode ? '+55 ' : '';

  if (local.length <= 2) return `${prefix}${local}`;
  if (local.length <= 6) return `${prefix}(${local.slice(0, 2)}) ${local.slice(2)}`;
  if (local.length <= 10)
    return `${prefix}(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return `${prefix}(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7, 11)}`;
}

export function WhatsAppOrderNotifications({ restaurantId }: Props) {
  const [formState, setFormState] = useState<FormState>(() => ({
    restaurantId,
    phone: '',
    optedIn: false,
  }));
  const currentState =
    formState.restaurantId === restaurantId
      ? formState
      : { restaurantId, phone: '', optedIn: false };
  const { phone, optedIn } = currentState;
  const validPhone = useMemo(() => isValidWhatsappOrderPhone(phone), [phone]);

  useEffect(() => {
    writeWhatsappOrderPhone(restaurantId, '');
    writeWhatsappOrderOptIn(restaurantId, false);
  }, [restaurantId]);

  const handlePhoneChange = (value: string) => {
    const formatted = formatWhatsappPhone(value);
    const nextValid = isValidWhatsappOrderPhone(formatted);
    const nextOptedIn = nextValid ? optedIn : false;
    setFormState({ restaurantId, phone: formatted, optedIn: nextOptedIn });
    writeWhatsappOrderPhone(restaurantId, formatted);

    if (!nextValid && optedIn) {
      writeWhatsappOrderOptIn(restaurantId, false);
    }
  };

  const handleOptInChange = (checked: boolean) => {
    if (!validPhone) return;
    setFormState({ restaurantId, phone, optedIn: checked });
    writeWhatsappOrderOptIn(restaurantId, checked);
  };

  return (
    <Section aria-labelledby="whatsapp-order-notifications-title">
      <div className="heading">
        <span className="brand-icon" aria-hidden="true">
          <WhatsAppIcon size={34} />
        </span>
        <div>
          <strong id="whatsapp-order-notifications-title">Receba atualizações no WhatsApp</strong>
          <p>Digite o número que deve receber as notificações automáticas deste pedido.</p>
        </div>
      </div>

      <label className="phone-field">
        <span>Número do WhatsApp</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => handlePhoneChange(event.target.value)}
          placeholder="(85) 99999-9999"
          aria-describedby="whatsapp-order-phone-help"
        />
      </label>

      <small id="whatsapp-order-phone-help" className={validPhone ? 'phone-ok' : undefined}>
        {validPhone
          ? 'Número válido. Ative abaixo para receber os avisos automáticos.'
          : 'Informe um número com DDD para liberar as notificações automáticas.'}
      </small>

      <label className={`opt-in ${validPhone ? '' : 'disabled'}`}>
        <input
          type="checkbox"
          checked={optedIn}
          disabled={!validPhone}
          onChange={(event) => handleOptInChange(event.target.checked)}
        />
        <span className="custom-check" aria-hidden="true">
          {optedIn ? <Check size={16} strokeWidth={3} /> : null}
        </span>
        <span className="opt-in-copy">
          <b>Quero receber as atualizações automáticas deste pedido</b>
          <small>
            Avisaremos sobre pagamento confirmado, preparo, pedido pronto, saída para entrega,
            entrega concluída ou cancelamento.
          </small>
        </span>
      </label>
    </Section>
  );
}

const Section = styled.section`
  width: 100%;
  display: grid;
  gap: 11px;
  margin: 2px 0 14px;
  padding: 2px 0 16px;
  border-bottom: 1px solid var(--home-border);
  background: transparent;

  .heading {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 11px;
  }

  .brand-icon {
    display: grid;
    place-items: center;
    color: #25d366;
    line-height: 0;
  }

  .heading div {
    min-width: 0;
  }

  .heading strong {
    display: block;
    color: var(--home-text);
    font-size: 15px;
    font-weight: 850;
    line-height: 1.25;
  }

  .heading p {
    margin: 3px 0 0;
    color: #6d736f;
    font-size: 11px;
    line-height: 1.45;
  }

  .phone-field {
    display: grid;
    gap: 6px;
  }

  .phone-field > span {
    color: #3e4541;
    font-size: 11px;
    font-weight: 800;
  }

  .phone-field input {
    width: 100%;
    height: 46px;
    padding: 0 13px;
    border: 1px solid #cfd6d2;
    border-radius: 12px;
    background: #fff;
    color: #1d2420;
    font: inherit;
    font-size: 14px;
    font-weight: 650;
    outline: none;
    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease;
  }

  .phone-field input::placeholder {
    color: #989e9a;
    font-weight: 500;
  }

  .phone-field input:focus {
    border-color: #25d366;
    box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.12);
  }

  > small {
    margin-top: -4px;
    color: #7a817d;
    font-size: 10px;
    line-height: 1.4;
  }

  > small.phone-ok {
    color: #16883f;
  }

  .opt-in {
    position: relative;
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr);
    align-items: start;
    gap: 10px;
    padding-top: 2px;
    cursor: pointer;
    user-select: none;
  }

  .opt-in input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .custom-check {
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    border: 1.5px solid #b9c2bd;
    border-radius: 8px;
    background: #fff;
    color: #fff;
    transition:
      background-color 0.18s ease,
      border-color 0.18s ease,
      transform 0.18s ease,
      box-shadow 0.18s ease;
  }

  .opt-in:has(input:checked) .custom-check {
    border-color: #25d366;
    background: #25d366;
    box-shadow: 0 4px 12px rgba(37, 211, 102, 0.24);
  }

  .opt-in:has(input:focus-visible) .custom-check {
    box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.16);
  }

  .opt-in:not(.disabled):active .custom-check {
    transform: scale(0.94);
  }

  .opt-in-copy {
    display: grid;
    gap: 3px;
    padding-top: 1px;
  }

  .opt-in-copy b {
    color: #303733;
    font-size: 11px;
    line-height: 1.35;
  }

  .opt-in-copy small {
    color: #757c78;
    font-size: 10px;
    line-height: 1.45;
  }

  .opt-in.disabled {
    cursor: not-allowed;
  }

  .opt-in.disabled .custom-check,
  .opt-in.disabled .opt-in-copy {
    opacity: 0.5;
  }
`;
