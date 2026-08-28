import { Check } from 'lucide-react';
import type { PasswordPolicy } from './passwordPolicy';
import { getPasswordRequirements, STANDARD_PASSWORD_POLICY } from './passwordPolicy';
import * as S from './PasswordRequirements.styles';

type PasswordRequirementsProps = {
  password: string;
  confirmation: string;
  policy?: PasswordPolicy;
  id?: string;
  title?: string;
};

export function PasswordRequirements({
  password,
  confirmation,
  policy = STANDARD_PASSWORD_POLICY,
  id,
  title = 'A nova senha precisa ter:',
}: PasswordRequirementsProps) {
  if (password.length === 0) {
    return null;
  }

  const requirements = getPasswordRequirements(password, confirmation, policy);

  return (
    <S.Panel id={id} aria-label="Requisitos da senha">
      <S.Title>{title}</S.Title>
      <S.List aria-live="polite" aria-atomic="false">
        {requirements.map((requirement) => (
          <S.Item
            key={requirement.id}
            $met={requirement.met}
            data-requirement={requirement.id}
            data-met={requirement.met}
            aria-label={`${requirement.label}: ${
              requirement.met ? 'requisito cumprido' : 'requisito a cumprir'
            }`}
          >
            <S.Icon $met={requirement.met} aria-hidden="true">
              {requirement.met ? <Check size={11} strokeWidth={3.2} /> : null}
            </S.Icon>
            <S.Label>{requirement.label}</S.Label>
          </S.Item>
        ))}
      </S.List>
    </S.Panel>
  );
}
