import { describe, expect, it } from 'vitest';
import { formatBillingPixRemaining } from './useBillingPixExpiry';

describe('formatBillingPixRemaining', () => {
  it('mostra dias para validades longas sem converter tudo em minutos', () => {
    expect(formatBillingPixRemaining(6 * 86_400 + 23 * 3_600 + 58 * 60)).toBe(
      '6 dias 23h 58min',
    );
  });

  it('preserva o formato existente quando falta menos de um dia', () => {
    expect(formatBillingPixRemaining(23 * 3_600 + 42 * 60 + 7)).toBe('1422:07');
  });

  it('preserva minutos e segundos para prazos curtos', () => {
    expect(formatBillingPixRemaining(9 * 60 + 5)).toBe('09:05');
  });
});
