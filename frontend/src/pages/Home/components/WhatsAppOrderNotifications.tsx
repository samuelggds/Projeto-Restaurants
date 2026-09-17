import { Check, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  isValidWhatsappOrderPhone,
  readWhatsappOrderOptIn,
  readWhatsappOrderPhone,
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
  const [editing, setEditing] = useState(false);
  const [formState, setFormState] = useState<FormState>(() => ({
    restaurantId,
    phone: readWhatsappOrderPhone(restaurantId),
    optedIn: readWhatsappOrderOptIn(restaurantId),
  }));
  const currentState =
    formState.restaurantId === restaurantId
      ? formState
      : {
          restaurantId,
          phone: readWhatsappOrderPhone(restaurantId),
          optedIn: readWhatsappOrderOptIn(restaurantId),
        };
  const { phone, optedIn } = currentState;
  const validPhone = useMemo(() => isValidWhatsappOrderPhone(phone), [phone]);
  const active = validPhone && optedIn;

  useEffect(() => {
    setFormState({
      restaurantId,
      phone: readWhatsappOrderPhone(restaurantId),
      optedIn: readWhatsappOrderOptIn(restaurantId),
    });
  }, [restaurantId]);

  const handlePhoneChange = (value: string) => {
    const formatted = formatWhatsappPhone(value);
    const nextValid = isValidWhatsappOrderPhone(formatted);
    const nextOptedIn = nextValid ? optedIn : false;
    setFormState({ restaurantId, phone: formatted, optedIn: nextOptedIn });
    writeWhatsappOrderPhone(restaurantId, formatted);

    if (!nextValid && optedIn) writeWhatsappOrderOptIn(restaurantId, false);
  };

  const handleOptInChange = (checked: boolean) => {
    if (!validPhone) return;
    setFormState({ restaurantId, phone, optedIn: checked });
    writeWhatsappOrderOptIn(restaurantId, checked);
  };

  return (
    <Section aria-labelledby="whatsapp-order-notifications-title">
      <SummaryButton type="button" onClick={() => setEditing(true)} $active={active}>
        <span className="brand-icon" aria-hidden="true">
          <WhatsAppIcon size={22} />
        </span>
        <span className="copy">
          <b id="whatsapp-order-notifications-title">
            {active ? 'Atualizações no WhatsApp ativadas' : 'Receber atualizações no WhatsApp'}
          </b>
          <small>
            {active ? `${phone} · toque para alterar` : 'Cadastre um número para acompanhar o pedido'}
          </small>
        </span>
        <span className="action">
          {active ? <CheckCircle2 size={16} /> : <span>Cadastrar</span>}
          <ChevronRight size={17} />
        </span>
      </SummaryButton>

      {editing ? (
        <Editor>
          <div className="heading">
            <div>
              <b>Receba atualizações no WhatsApp</b>
              <small>Use o número que deve receber os avisos automáticos deste pedido.</small>
            </div>
            <button type="button" className="close" onClick={() => setEditing(false)} aria-label="Fechar">
              <X size={17} />
            </button>
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
              autoFocus
            />
          </label>

          <label className={`opt-in ${validPhone ? '' : 'disabled'}`}>
            <input
              type="checkbox"
              checked={optedIn}
              disabled={!validPhone}
              onChange={(event) => handleOptInChange(event.target.checked)}
            />
            <span className="custom-check" aria-hidden="true">
              {optedIn ? <Check size={15} strokeWidth={3} /> : null}
            </span>
            <span className="opt-in-copy">
              <b>Quero receber as atualizações automáticas</b>
              <small>Pagamento, preparo, pedido pronto, saída para entrega, entrega ou cancelamento.</small>
            </span>
          </label>

          <button
            type="button"
            className="save"
            disabled={!active}
            onClick={() => setEditing(false)}
          >
            Confirmar WhatsApp
          </button>
        </Editor>
      ) : null}
    </Section>
  );
}

const Section = styled.section`
  width: 100%;
  display: grid;
  gap: 8px;
`;

const SummaryButton = styled.button<{ $active: boolean }>`
  width: 100%;
  min-height: 58px;
  padding: 10px 11px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 1px solid ${({ $active }) => ($active ? '#cdebd7' : '#e4ddd6')};
  border-radius: 12px;
  background: ${({ $active }) => ($active ? '#f8fff9' : '#fff')};
  color: var(--home-text);
  font: inherit;
  text-align: left;
  cursor: pointer;

  .brand-icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: #ebfbf1;
    color: #25d366;
  }

  .copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .copy b {
    color: #28231f;
    font-size: 12px;
    font-weight: 850;
  }

  .copy small {
    overflow: hidden;
    color: #7b746e;
    font-size: 10px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .action {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: ${({ $active }) => ($active ? '#16883f' : 'var(--home-primary)')};
    font-size: 10px;
    font-weight: 850;
    white-space: nowrap;
  }
`;

const Editor = styled.div`
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #dbe7de;
  border-radius: 12px;
  background: #fbfefc;

  .heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }

  .heading > div {
    display: grid;
    gap: 2px;
  }

  .heading b {
    color: #29241f;
    font-size: 12px;
  }

  .heading small {
    color: #766f69;
    font-size: 9px;
    line-height: 1.4;
  }

  .close {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 8px;
    background: #eef5f0;
    color: #526058;
    cursor: pointer;
  }

  .phone-field {
    display: grid;
    gap: 5px;
  }

  .phone-field > span {
    color: #514b44;
    font-size: 10px;
    font-weight: 800;
  }

  .phone-field input {
    width: 100%;
    height: 42px;
    padding: 0 12px;
    border: 1px solid #cfd6d2;
    border-radius: 10px;
    background: #fff;
    color: #1d2420;
    font: inherit;
    font-size: 13px;
    outline: none;
  }

  .phone-field input:focus {
    border-color: #25d366;
    box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.12);
  }

  .opt-in {
    position: relative;
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 9px;
    cursor: pointer;
  }

  .opt-in input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .custom-check {
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border: 1.5px solid #b9c2bd;
    border-radius: 7px;
    background: #fff;
    color: #fff;
  }

  .opt-in:has(input:checked) .custom-check {
    border-color: #25d366;
    background: #25d366;
  }

  .opt-in-copy {
    display: grid;
    gap: 2px;
  }

  .opt-in-copy b {
    color: #303733;
    font-size: 10px;
  }

  .opt-in-copy small {
    color: #757c78;
    font-size: 9px;
    line-height: 1.4;
  }

  .opt-in.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .save {
    min-height: 40px;
    border: 0;
    border-radius: 10px;
    background: #25b85b;
    color: #fff;
    font: inherit;
    font-size: 11px;
    font-weight: 850;
    cursor: pointer;
  }

  .save:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;
