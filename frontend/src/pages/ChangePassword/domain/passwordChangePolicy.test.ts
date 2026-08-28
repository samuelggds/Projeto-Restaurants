import { describe, expect, it } from 'vitest';
import { validatePrivilegedPassword } from './passwordChangePolicy';

describe('política de senha privilegiada', () => {
  it('aceita uma senha inicial forte', () => {
    expect(validatePrivilegedPassword('V3ry-Str0ng-Bootstrap!')).toEqual([]);
  });

  it('rejeita senha curta, previsível e sem diversidade', () => {
    expect(validatePrivilegedPassword('senha123').join(' ')).toMatch(
      /16.*maiúsculas.*símbolo.*previsível/iu,
    );
  });

  it('respeita o limite de 72 bytes do bcrypt', () => {
    expect(validatePrivilegedPassword(`Aa1!${'x'.repeat(69)}`).join(' ')).toMatch(/72 bytes/iu);
  });
});
