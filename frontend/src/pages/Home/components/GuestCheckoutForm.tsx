import { CheckCircle2, ChevronRight, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import styled from 'styled-components';

export type GuestCheckoutDetails = {
  name: string;
  cpf?: string;
  phone?: string;
};

type Props = {
  value: GuestCheckoutDetails;
  onChange: (value: GuestCheckoutDetails) => void;
};

export function GuestCheckoutForm({ value, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const name = value.name.trim();
  const complete = name.length >= 2;

  return (
    <Section aria-label="Seus dados para o pedido">
      <SummaryButton type="button" onClick={() => setEditing(true)} $complete={complete}>
        <span className="icon" aria-hidden="true">
          <UserRound size={19} />
        </span>
        <span className="copy">
          <b>{complete ? name : 'Identificação do cliente'}</b>
          <small>
            {complete
              ? 'Pedido como visitante · toque para alterar'
              : 'Cadastre seu nome para identificar o pedido'}
          </small>
        </span>
        <span className="action">
          {complete ? <CheckCircle2 size={16} /> : <span>Cadastrar</span>}
          <ChevronRight size={17} aria-hidden="true" />
        </span>
      </SummaryButton>

      {editing ? (
        <Editor>
          <div className="heading">
            <div>
              <b>Como podemos chamar você?</b>
              <small>Você continua como visitante e não precisa criar conta.</small>
            </div>
            <button type="button" className="close" onClick={() => setEditing(false)} aria-label="Fechar">
              <X size={17} />
            </button>
          </div>

          <label>
            <span>Nome</span>
            <input
              autoComplete="name"
              value={value.name}
              onChange={(event) => onChange({ ...value, name: event.target.value.slice(0, 80) })}
              placeholder="Digite seu nome"
              minLength={2}
              required
              autoFocus
            />
          </label>

          <button
            type="button"
            className="save"
            disabled={!complete}
            onClick={() => setEditing(false)}
          >
            Confirmar nome
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

const SummaryButton = styled.button<{ $complete: boolean }>`
  width: 100%;
  min-height: 58px;
  padding: 10px 11px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 1px solid ${({ $complete }) => ($complete ? '#d9e8dc' : '#e4ddd6')};
  border-radius: 12px;
  background: ${({ $complete }) => ($complete ? '#fbfefb' : '#fff')};
  color: var(--home-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--home-primary) 45%, #e4ddd6);
    box-shadow: 0 5px 16px rgba(34, 29, 25, 0.06);
    transform: translateY(-1px);
  }

  .icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: color-mix(in srgb, var(--home-primary) 9%, #f5f1ed);
    color: var(--home-primary);
  }

  .copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .copy b {
    overflow: hidden;
    color: #28231f;
    font-size: 12px;
    font-weight: 850;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    color: ${({ $complete }) => ($complete ? '#2d8a4c' : 'var(--home-primary)')};
    font-size: 10px;
    font-weight: 850;
    white-space: nowrap;
  }
`;

const Editor = styled.div`
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e3d9d0;
  border-radius: 12px;
  background: #fcfaf7;

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
    background: #f0ebe6;
    color: #615952;
    cursor: pointer;
  }

  label {
    display: grid;
    gap: 5px;
  }

  label > span {
    color: #514b44;
    font-size: 10px;
    font-weight: 800;
  }

  input {
    width: 100%;
    height: 42px;
    padding: 0 12px;
    border: 1px solid #dcd2c7;
    border-radius: 10px;
    background: #fff;
    color: #241f1b;
    font: inherit;
    font-size: 13px;
    outline: none;
  }

  input:focus {
    border-color: var(--home-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--home-primary) 12%, transparent);
  }

  .save {
    min-height: 40px;
    border: 0;
    border-radius: 10px;
    background: var(--home-primary);
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
