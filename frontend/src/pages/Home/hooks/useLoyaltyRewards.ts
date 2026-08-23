import { useCallback, useEffect, useRef, useState } from 'react';
import loyaltyService from '../../../Services/loyaltyService';
import type { LoyaltySummary } from '../types';

type Notify = (
  type: 'success' | 'error' | 'info' | 'warning',
  title: string,
  message?: string,
) => void;

type Options = {
  restaurantId: number | null;
  enabled: boolean;
  notify: Notify;
};

export function useLoyaltyRewards({ restaurantId, enabled, notify }: Options) {
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [summaryRestaurantId, setSummaryRestaurantId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [redeemingCouponId, setRedeemingCouponId] = useState<number | null>(null);
  const requestSequence = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled || !restaurantId) {
      return;
    }
    const requestId = ++requestSequence.current;
    setLoading(true);
    try {
      const nextSummary = await loyaltyService.getSummary(restaurantId);
      if (requestId !== requestSequence.current) return;
      setSummary(nextSummary);
      setSummaryRestaurantId(restaurantId);
    } catch {
      if (requestId !== requestSequence.current) return;
      setSummary(null);
      setSummaryRestaurantId(restaurantId);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [enabled, restaurantId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(timeout);
      requestSequence.current += 1;
    };
  }, [refresh]);

  const redeem = useCallback(
    async (couponId: number) => {
      if (!restaurantId || redeemingCouponId) return;
      setRedeemingCouponId(couponId);
      try {
        await loyaltyService.redeem(couponId, restaurantId);
        await refresh();
        notify(
          'success',
          'Cupom resgatado',
          'Seu benefício já está disponível para aplicar na sacola.',
        );
      } catch (error: unknown) {
        const typed = error as { response?: { data?: { error?: unknown } } };
        notify(
          'error',
          'Não foi possível resgatar',
          String(typed.response?.data?.error || 'Confira sua meta e tente novamente.'),
        );
      } finally {
        setRedeemingCouponId(null);
      }
    },
    [notify, redeemingCouponId, refresh, restaurantId],
  );

  return {
    summary: enabled && summaryRestaurantId === restaurantId ? summary : null,
    loading: enabled ? loading : false,
    redeemingCouponId,
    redeem,
    refresh,
  };
}
