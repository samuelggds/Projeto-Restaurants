import { describe, expect, it } from 'vitest';
import { formatAdminAccessRemaining } from './AdminPortalLoginGate';

describe('formatAdminAccessRemaining', () => {
  it('mostra dias, horas, minutos e segundos em tempo real', () => {
    const now = Date.parse('2026-09-30T12:00:00.000Z');
    const expiresAt = '2026-10-07T11:02:03.000Z';

    expect(formatAdminAccessRemaining(expiresAt, now)).toBe('6d 23h 2m 3s');
    expect(formatAdminAccessRemaining(expiresAt, now + 1000)).toBe('6d 23h 2m 2s');
  });

  it('nunca mostra tempo negativo', () => {
    const expiresAt = '2026-09-30T12:00:00.000Z';
    expect(formatAdminAccessRemaining(expiresAt, Date.parse(expiresAt) + 5000)).toBe('0s');
  });
});
