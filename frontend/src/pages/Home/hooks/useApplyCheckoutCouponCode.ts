import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { isUsableLoyaltyRedemption, loyaltyRedemptionEntries } from '../domain/loyaltyRedemption';
import type { LoyaltySummary, PublicPromotionalCoupon } from '../types';
import type { useHomeNotifications } from './useHomeNotifications';

export function useApplyCheckoutCouponCode({
  promotionalCoupons, isLoyaltyCustomer, loyaltySummary, loyaltyClock,
  notify, setSelectedRedemptionId, setSelectedPromoCode,
}: {
  promotionalCoupons: PublicPromotionalCoupon[];
  isLoyaltyCustomer: boolean;
  loyaltySummary: LoyaltySummary | null;
  loyaltyClock: number;
  notify: ReturnType<typeof useHomeNotifications>['notify'];
  setSelectedRedemptionId: Dispatch<SetStateAction<number | null>>;
  setSelectedPromoCode: Dispatch<SetStateAction<string>>;
}) {
  return useCallback((value: string) => {
    const code = String(value || '').trim().toUpperCase();
    if (!code) return;
    const promo = promotionalCoupons.find((item) => item.code === code);
    if (promo) {
      setSelectedRedemptionId(null);
      setSelectedPromoCode(promo.code);
      return;
    }
    if (!isLoyaltyCustomer) {
      notify('info', 'Cupom não encontrado', 'Este código não é uma promoção ativa deste restaurante.');
      return;
    }
    const match = loyaltyRedemptionEntries(loyaltySummary).find(
      ({ coupon, redemption }) =>
        isUsableLoyaltyRedemption(redemption, loyaltyClock) &&
        String(coupon.code || '').trim().toUpperCase() === code,
    );
    if (!match) {
      notify('warning', 'Cupom não disponível', 'Confira o código ou escolha um dos cupons disponíveis na sua conta.');
      return;
    }
    setSelectedRedemptionId(match.redemption.id);
    setSelectedPromoCode('');
  }, [isLoyaltyCustomer, loyaltySummary, loyaltyClock, notify, promotionalCoupons, setSelectedPromoCode, setSelectedRedemptionId]);
}
