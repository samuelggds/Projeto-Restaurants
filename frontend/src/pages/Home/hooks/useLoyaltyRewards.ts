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

export const LOYALTY_REFRESH_INTERVAL_MS = 30_000;

export function useLoyaltyRewards({ restaurantId, enabled, notify }: Options) {
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [summaryRestaurantId, setSummaryRestaurantId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [errorRestaurantId, setErrorRestaurantId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [redeemingCouponId, setRedeemingCouponId] = useState<number | null>(null);
  const requestSequence = useRef(0);
  const restaurantContextSequence = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled || !restaurantId) {
      return;
    }
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError('');
    setErrorRestaurantId(restaurantId);
    try {
      const nextSummary = await loyaltyService.getSummary(restaurantId);
      if (requestId !== requestSequence.current) return;
      setSummary(nextSummary);
      setSummaryRestaurantId(restaurantId);
    } catch {
      if (requestId !== requestSequence.current) return;
      setSummary(null);
      setSummaryRestaurantId(restaurantId);
      setError('Não foi possível consultar seus benefícios agora.');
      setErrorRestaurantId(restaurantId);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [enabled, restaurantId]);

  useEffect(() => {
    const contextId = ++restaurantContextSequence.current;
    if (!enabled || !restaurantId) {
      requestSequence.current += 1;
      return () => {
        if (restaurantContextSequence.current === contextId) {
          restaurantContextSequence.current += 1;
        }
      };
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };
    const timeout = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(refreshWhenVisible, LOYALTY_REFRESH_INTERVAL_MS);
    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener('online', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('online', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      requestSequence.current += 1;
      if (restaurantContextSequence.current === contextId) {
        restaurantContextSequence.current += 1;
      }
    };
  }, [enabled, refresh, restaurantId]);

  const redeem = useCallback(
    async (couponId: number) => {
      if (!restaurantId || redeemingCouponId) return;
      const redemptionRestaurantId = restaurantId;
      const redemptionContextId = restaurantContextSequence.current;
      setRedeemingCouponId(couponId);
      try {
        await loyaltyService.redeem(couponId, redemptionRestaurantId);
        if (restaurantContextSequence.current === redemptionContextId) {
          await refresh();
        }
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
    error: enabled && errorRestaurantId === restaurantId ? error : '',
    redeemingCouponId,
    redeem,
    refresh,
  };
}
