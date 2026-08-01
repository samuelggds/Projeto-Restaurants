import type { InputHTMLAttributes, ReactNode } from "react";
import * as S from "../styles/settings.styles";

type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, hint, children }: FieldProps) {
  return (
    <S.FieldLabel>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </S.FieldLabel>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function FormInput(props: InputProps) {
  return <S.Input {...props} />;
}

type SwitchProps = {
  checked: boolean;
  label: string;
  description?: string;
  onChange: (checked: boolean) => void;
};

export function Switch({ checked, label, description, onChange }: SwitchProps) {
  return (
    <S.SwitchLabel>
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        style={{ display: "none" }}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <S.SwitchTrack $checked={checked} onClick={() => onChange(!checked)} />
    </S.SwitchLabel>
  );
}
