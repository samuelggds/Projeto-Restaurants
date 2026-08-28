import { describe, expect, it } from 'vitest';
import {
  evaluatePassword,
  getPasswordRequirements,
  PRIVILEGED_PASSWORD_POLICY,
  STANDARD_PASSWORD_POLICY,
  validatePassword,
} from './passwordPolicy';

describe('política compartilhada de senha', () => {
  it('aceita os seis requisitos padrão com no mínimo oito caracteres', () => {
    const evaluation = evaluatePassword('Segura#123', 'Segura#123', STANDARD_PASSWORD_POLICY);

    expect(evaluation.isValid).toBe(true);
    expect(evaluation.errors).toEqual([]);
    expect(evaluation.requirements.every((requirement) => requirement.met)).toBe(true);
  });

  it('informa cada requisito pendente, inclusive a confirmação', () => {
    const requirements = getPasswordRequirements('fraca', 'diferente');

    expect(requirements.filter((requirement) => !requirement.met).map(({ id }) => id)).toEqual([
      'length',
      'uppercase',
      'number',
      'special',
      'confirmation',
    ]);
    expect(validatePassword('fraca', 'diferente').join(' ')).toMatch(
      /8 caracteres.*maiúscula.*número.*especial.*confirmação/iu,
    );
  });

  it('reconhece letras e números Unicode', () => {
    expect(evaluatePassword('Árvore#٢x', 'Árvore#٢x').isValid).toBe(true);
  });

  it('respeita o limite seguro de 72 bytes mesmo abaixo de 72 caracteres', () => {
    const password = `Áa1!${'ç'.repeat(35)}`;
    const evaluation = evaluatePassword(password, password);

    expect(evaluation.requirements.find(({ id }) => id === 'maxBytes')?.met).toBe(false);
    expect(evaluation.errors.join(' ')).toMatch(/72 bytes/iu);
  });

  it('mantém o mínimo uniforme de oito caracteres no fluxo privilegiado', () => {
    expect(evaluatePassword('Ab1!cdef', 'Ab1!cdef', PRIVILEGED_PASSWORD_POLICY).isValid).toBe(true);
    expect(PRIVILEGED_PASSWORD_POLICY.minLength).toBe(8);
  });

  it('continua rejeitando valores previsíveis no fluxo privilegiado', () => {
    const evaluation = evaluatePassword(
      'SuperAdmin#Senha123',
      'SuperAdmin#Senha123',
      PRIVILEGED_PASSWORD_POLICY,
    );

    expect(evaluation.isValid).toBe(false);
    expect(evaluation.errors.join(' ')).toMatch(/previsível/iu);
    expect(evaluation.requirements.find(({ id }) => id === 'notPredictable')?.met).toBe(false);
  });
});
