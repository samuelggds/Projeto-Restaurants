import type { useLoyaltyRewards } from '../hooks/useLoyaltyRewards';
import type { PublicPromotionalCoupon } from '../types';
import { CheckoutPromotionalCouponPicker } from './CheckoutPromotionalCouponPicker';
import { LoyaltyCouponPanel } from './LoyaltyCouponPanel';

type Props = {
  promotionalCoupons: PublicPromotionalCoupon[];
  confirmedCode: string;
  pendingCode: string | null;
  onApply: (code: string) => void;
  loggedIn: boolean;
  loyalty: ReturnType<typeof useLoyaltyRewards>;
  selectedRedemptionId: number | null;
  onSelectRedemption: (id: number | null) => void;
  onLogin: () => void;
};

export function CheckoutCouponContent({
  promotionalCoupons, confirmedCode, pendingCode, onApply,
  loggedIn, loyalty, selectedRedemptionId, onSelectRedemption, onLogin,
}: Props) {
  return (
    <>
      {promotionalCoupons.length > 0 && (
        <CheckoutPromotionalCouponPicker
          coupons={promotionalCoupons}
          appliedCode={confirmedCode}
          pendingCode={pendingCode}
          onApply={onApply}
        />
      )}
      <LoyaltyCouponPanel
        loggedIn={loggedIn}
        loading={loyalty.loading}
        error={loyalty.error}
        summary={loyalty.summary}
        selectedRedemptionId={selectedRedemptionId}
        redeemingCouponId={loyalty.redeemingCouponId}
        onSelect={onSelectRedemption}
        onLogin={onLogin}
        onRetry={() => void loyalty.refresh()}
        onRedeem={(id) => void loyalty.redeem(id)}
      />
    </>
  );
}
