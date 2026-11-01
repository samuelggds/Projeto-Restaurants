import { useRef, type ChangeEvent } from 'react';
import styled from 'styled-components';

const Field = styled.label`
  display: grid;
  gap: 10px;
  width: fit-content;
  max-width: 100%;
  font-size: 14px;
  font-weight: 650;
  color: inherit;
  .digits { position: relative; display: flex; gap: 12px; width: fit-content; cursor: text; }
  .digit { width: 66px; height: 72px; border: 1.5px solid #cbd4dd; border-radius: 13px; background: #fff;
    display: grid; place-items: center; color: #202e3c; font-size: 30px; font-weight: 700; transition: border-color .16s, box-shadow .16s; }
  .digits:focus-within .digit[data-active="true"] { border-color: #db4d08; box-shadow: 0 0 0 3px #db4d0820; }
  .digits:focus-within .digit:not([data-active="true"]) { border-color: #d4b2a1; }
  input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.01; border: 0; margin: 0;
    cursor: text; font-size: 20px; background: transparent; color: transparent; padding: 0; }
  @media(max-width: 370px) { .digit { width: 59px; height: 64px; } .digits { gap: 9px; } }
`;

type Props = { value: string; onChange: (value: string) => void; disabled?: boolean; label?: string };
export default function NfcCpfThreeDigits({ value, onChange, disabled = false, label = '3 primeiros dígitos do CPF' }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const normalized = value.replace(/\D/gu, '').slice(0, 3);
  function change(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value.replace(/\D/gu, '').slice(0, 3));
  }
  return <Field>
    <span>{label}</span>
    <span className="digits" onClick={() => input.current?.focus()}>
      {Array.from({ length: 3 }, (_, index) => <span key={index} aria-hidden="true" className="digit"
        data-active={index === normalized.length && normalized.length < 3 ? 'true' : 'false'}>
        {normalized[index] ? '•' : ''}
      </span>)}
      <input ref={input} aria-label={label} type="password" autoComplete="off" inputMode="numeric"
        pattern="[0-9]{3}" minLength={3} maxLength={3} required disabled={disabled}
        value={normalized} onChange={change} />
    </span>
  </Field>;
}
