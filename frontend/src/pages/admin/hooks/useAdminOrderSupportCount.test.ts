import { describe, expect, it } from 'vitest';
import { formatAdminSupportBadge } from './useAdminOrderSupportCount';

describe('indicador de suporte do admin', () => {
  it('apresenta números exatos e limita o texto acima de 99', () => {
    expect(formatAdminSupportBadge(0)).toBe('0');
    expect(formatAdminSupportBadge(1)).toBe('1');
    expect(formatAdminSupportBadge(8)).toBe('8');
    expect(formatAdminSupportBadge(99)).toBe('99');
    expect(formatAdminSupportBadge(100)).toBe('99+');
  });
});
