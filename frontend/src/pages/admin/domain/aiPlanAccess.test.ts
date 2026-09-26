import { describe, expect, it } from 'vitest';
import { hasPremiumAiAccess } from './aiPlanAccess';

describe('hasPremiumAiAccess', () => {
  it('libera IA para Premium ativo ou em teste', () => {
    expect(hasPremiumAiAccess({ plan: 'PREMIUM', status: 'ATIVA' })).toBe(true);
    expect(hasPremiumAiAccess({ plan: 'PREMIUM', status: 'TESTE' })).toBe(true);
  });

  it('bloqueia IA para o plano Básico mesmo ativo ou em teste', () => {
    expect(hasPremiumAiAccess({ plan: 'BASICO', status: 'ATIVA' })).toBe(false);
    expect(hasPremiumAiAccess({ plan: 'BASICO', status: 'TESTE' })).toBe(false);
  });

  it('bloqueia Premium sem assinatura válida e falha fechado sem dados', () => {
    expect(hasPremiumAiAccess({ plan: 'PREMIUM', status: 'EXPIRADA' })).toBe(false);
    expect(hasPremiumAiAccess({ plan: 'PREMIUM', status: 'CANCELADA' })).toBe(false);
    expect(hasPremiumAiAccess(null)).toBe(false);
  });
});
