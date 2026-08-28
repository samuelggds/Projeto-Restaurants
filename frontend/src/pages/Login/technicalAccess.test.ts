import { describe, expect, it } from 'vitest';
import { canUseTechnicalAccess } from './technicalAccess';

describe('acesso técnico do Super Admin', () => {
  it('aceita exclusivamente SUPER_ADMIN', () => {
    expect(canUseTechnicalAccess({ role: 'SUPER_ADMIN' })).toBe(true);
    expect(canUseTechnicalAccess({ role: 'ADMIN' })).toBe(false);
    expect(canUseTechnicalAccess({ role: 'FUNCIONARIO' })).toBe(false);
    expect(canUseTechnicalAccess(null)).toBe(false);
  });
});
