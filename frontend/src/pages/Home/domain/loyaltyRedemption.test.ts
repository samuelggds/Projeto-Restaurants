import { describe, expect, it } from 'vitest';
import type { LoyaltyRedemption } from '../types';
import {
  isActiveLoyaltyRedemption,
  isUnexpiredLoyaltyRedemption,
  isUsableLoyaltyRedemption,
} from './loyaltyRedemption';

function redemption(overrides: Partial<LoyaltyRedemption> = {}): LoyaltyRedemption {
  return {
    id: 10,
    cycle: 1,
    status: 'CLAIMED',
    expiresAt: '2026-09-22T12:00:00.000Z',
    coupon: {
      id: 7,
      code: 'FIEL10',
      title: 'Cliente fiel',
      description: '',
      discountType: 'PERCENTAGE',
      discount: 10,
      minimumSubtotal: 0,
    },
    ...overrides,
  };
}

describe('estado utilizável do cupom de fidelidade', () => {
  const beforeExpiration = Date.parse('2026-09-20T12:00:00.000Z');
  const afterExpiration = Date.parse('2026-09-23T12:00:00.000Z');

  it('aceita somente um resgate CLAIMED ainda válido no checkout', () => {
    expect(isUsableLoyaltyRedemption(redemption(), beforeExpiration)).toBe(true);
    expect(isUsableLoyaltyRedemption(redemption({ status: 'RESERVED' }), beforeExpiration)).toBe(
      false,
    );
    expect(isUsableLoyaltyRedemption(redemption({ status: 'USED' }), beforeExpiration)).toBe(false);
  });

  it('rejeita expiração pelo relógio ou pelo estado devolvido pela API', () => {
    expect(isUnexpiredLoyaltyRedemption(redemption(), afterExpiration)).toBe(false);
    expect(isUsableLoyaltyRedemption(redemption({ expired: true }), beforeExpiration)).toBe(false);
    expect(isUsableLoyaltyRedemption(redemption({ status: 'EXPIRED' }), beforeExpiration)).toBe(
      false,
    );
  });

  it('mantém resgates reservados válidos como ativos, mas não reaplicáveis', () => {
    const reserved = redemption({ status: 'RESERVED' });
    expect(isActiveLoyaltyRedemption(reserved, beforeExpiration)).toBe(true);
    expect(isActiveLoyaltyRedemption(reserved, afterExpiration)).toBe(true);
    expect(isUsableLoyaltyRedemption(reserved, beforeExpiration)).toBe(false);
  });
});
