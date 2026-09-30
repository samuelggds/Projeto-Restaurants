import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LoyaltyCouponPanel } from './LoyaltyCouponPanel';

const summary = {
  restaurantId: 9,
  purchasesCompleted: 5,
  rewards: [
    {
      coupon: {
        id: 7,
        code: 'FIEL10',
        title: 'Cliente fiel',
        description: 'Benefício de teste',
        discountType: 'PERCENTAGE' as const,
        discount: 10,
        minimumSubtotal: 0,
        redemptionValidityDays: 30,
      },
      purchasesCompleted: 5,
      purchasesRequired: 5,
      remaining: 0,
      progressPercent: 100,
      canRedeem: false,
      limitReached: true,
      activeRedemptions: 1,
      walletLimit: 1,
      redemptions: [
        {
          id: 71,
          cycle: 1,
          status: 'CLAIMED' as const,
          expiresAt: '2099-09-22T12:00:00.000Z',
          expired: false,
          coupon: {
            id: 7,
            code: 'FIEL10',
            title: 'Cliente fiel',
            description: 'Benefício de teste',
            discountType: 'PERCENTAGE' as const,
            discount: 10,
            minimumSubtotal: 0,
            redemptionValidityDays: 30,
          },
        },
      ],
    },
  ],
};

describe('LoyaltyCouponPanel', () => {
  it('mostra o código do cupom junto do benefício disponível', () => {
    const markup = renderToStaticMarkup(
      <LoyaltyCouponPanel
        loggedIn
        loading={false}
        summary={summary}
        selectedRedemptionId={null}
        redeemingCouponId={null}
        onSelect={vi.fn()}
        onLogin={vi.fn()}
        onRetry={vi.fn()}
        onRedeem={vi.fn()}
      />,
    );

    expect(markup).toContain('Cliente fiel');
    expect(markup).toContain('código FIEL10');
    expect(markup).toContain('10% OFF');
  });

  it('envia redemptionId e couponCode ao selecionar o benefício', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onSelect = vi.fn();

    act(() => {
      root.render(
        <LoyaltyCouponPanel
          loggedIn
          loading={false}
          summary={summary}
          selectedRedemptionId={null}
          redeemingCouponId={null}
          onSelect={onSelect}
          onLogin={vi.fn()}
          onRetry={vi.fn()}
          onRedeem={vi.fn()}
        />,
      );
    });

    const button = container.querySelector('button[aria-pressed="false"]') as HTMLButtonElement;
    act(() => button.click());

    expect(onSelect).toHaveBeenCalledWith(71, 'FIEL10');

    act(() => root.unmount());
    container.remove();
  });
});
