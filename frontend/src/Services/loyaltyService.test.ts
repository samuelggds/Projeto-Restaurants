import { describe, expect, it } from 'vitest';
import { normalizeLoyaltySummary } from './loyaltyService';

describe('loyaltyService', () => {
  it('normaliza progresso e resgates do restaurante', () => {
    const summary = normalizeLoyaltySummary({
      restaurantId: 7,
      purchasesCompleted: 5,
      rewards: [
        {
          coupon: {
            id: 3,
            code: 'volte10',
            title: 'Cliente fiel',
            discountType: 'PERCENTAGE',
            discount: 10,
            minimumSubtotal: 20,
          },
          purchasesRequired: 5,
          purchasesCompleted: 5,
          remaining: 0,
          progressPercent: 100,
          canRedeem: false,
          limitReached: true,
          activeRedemptions: 1,
          walletLimit: 1,
          nextCycle: 2,
          redemptions: [
            {
              id: 8,
              cycle: 1,
              status: 'CLAIMED',
              expiresAt: '2026-09-22T12:00:00.000Z',
            },
            {
              id: 7,
              cycle: 0,
              status: 'EXPIRED',
              expiresAt: '2026-08-01T12:00:00.000Z',
              expired: true,
            },
          ],
        },
      ],
      redemptions: [
        {
          id: 20,
          cycle: 1,
          status: 'EXPIRED',
          expiresAt: '2026-01-01T12:00:00.000Z',
          expired: true,
          coupon: {
            id: 4,
            code: 'antigo5',
            title: 'Campanha pausada',
            discountType: 'PERCENTAGE',
            discount: 5,
            minimumSubtotal: 0,
          },
        },
      ],
    });

    expect(summary).toMatchObject({
      purchasesCompleted: 5,
      rewards: [
        {
          coupon: { id: 3, code: 'VOLTE10' },
          purchasesRequired: 5,
          limitReached: true,
          activeRedemptions: 1,
          walletLimit: 1,
          nextCycle: 2,
          redemptions: [
            {
              id: 8,
              status: 'CLAIMED',
              expiresAt: '2026-09-22T12:00:00.000Z',
              coupon: { id: 3 },
            },
            {
              id: 7,
              status: 'EXPIRED',
              expired: true,
              coupon: { id: 3 },
            },
          ],
        },
      ],
      redemptions: [
        {
          id: 20,
          status: 'EXPIRED',
          expired: true,
          coupon: { id: 4, code: 'ANTIGO5', title: 'Campanha pausada' },
        },
      ],
    });
  });

  it('ignora cupons e resgates inválidos vindos da API', () => {
    expect(normalizeLoyaltySummary({ rewards: [{ coupon: {} }] })).toEqual({
      purchasesCompleted: 0,
      rewards: [],
    });
  });
});
