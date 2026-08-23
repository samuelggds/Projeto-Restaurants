import { describe, expect, it } from 'vitest';
import type { LoyaltySummary } from '../types';
import { nextClaimedRedemptionExpiration } from './useLoyaltyExpirationClock';

function summary(): LoyaltySummary {
  const coupon = {
    id: 7,
    code: 'FIEL10',
    title: 'Cliente fiel',
    description: '',
    discountType: 'PERCENTAGE' as const,
    discount: 10,
    minimumSubtotal: 0,
  };
  return {
    purchasesCompleted: 0,
    rewards: [],
    redemptions: [
      {
        id: 1,
        cycle: 1,
        status: 'CLAIMED',
        expiresAt: '2026-08-24T12:00:00.000Z',
        coupon,
      },
      {
        id: 2,
        cycle: 2,
        status: 'RESERVED',
        expiresAt: '2026-08-23T11:00:00.000Z',
        coupon,
      },
      {
        id: 3,
        cycle: 3,
        status: 'CLAIMED',
        expiresAt: '2026-08-25T12:00:00.000Z',
        coupon,
      },
    ],
  };
}

describe('relógio de expiração da fidelidade', () => {
  it('agenda a atualização no primeiro CLAIMED futuro e ignora RESERVED', () => {
    expect(nextClaimedRedemptionExpiration(summary(), Date.parse('2026-08-23T12:00:00.000Z'))).toBe(
      Date.parse('2026-08-24T12:00:00.000Z'),
    );
  });

  it('não agenda resgates já vencidos', () => {
    expect(
      nextClaimedRedemptionExpiration(summary(), Date.parse('2026-08-26T12:00:00.000Z')),
    ).toBeNull();
  });
});
