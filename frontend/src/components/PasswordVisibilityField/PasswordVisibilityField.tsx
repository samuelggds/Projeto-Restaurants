import {
  cloneElement,
  useState,
  type InputHTMLAttributes,
  type ReactElement,
} from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styled from 'styled-components';

const Field = styled.div`
  position: relative;
  width: 100%;
  min-width: 0;

  > input {
    width: 100%;
    padding-right: 46px !important;
  }
`;

const Toggle = styled.button`
  position: absolute;
  top: 50%;
  right: 7px;
  transform: translateY(-50%);
  width: 34px !important;
  min-width: 34px;
  height: 34px !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 8px !important;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  background: transparent !important;
  color: currentColor !important;
  opacity: 0.58;
  cursor: pointer;
  z-index: 2;

  &:hover:not(:disabled) {
    opacity: 0.9;
    background: rgba(15, 23, 42, 0.06) !important;
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    opacity: 1;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.32;
  }

  svg {
    width: 18px;
    height: 18px;
    pointer-events: none;
  }
`;

type PasswordVisibilityFieldProps = {
  children: ReactElement<InputHTMLAttributes<HTMLInputElement>>;
  label?: string;
};

export function PasswordVisibilityField({
  children,
  label = 'senha',
}: PasswordVisibilityFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Field>
      {cloneElement(children, {
        type: visible ? 'text' : 'password',
      })}
      <Toggle
        type="button"
        aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
        aria-pressed={visible}
        title={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
        disabled={Boolean(children.props.disabled)}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Toggle>
    </Field>
  );
}
