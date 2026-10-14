import { useEffect, useState } from 'react';
import { listPublicPromotionalCoupons } from '../../../Services/publicCouponsService';
import type { PublicPromotionalCoupon } from '../types';

type Result = { restaurantId: number; coupons: PublicPromotionalCoupon[] };

export function usePromotionalCoupons(restaurantId: number | null, disabled: boolean) {
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    let alive = true;
    if (restaurantId && !disabled) {
      void listPublicPromotionalCoupons(restaurantId)
        .then((coupons) => { if (alive) setResult({ restaurantId, coupons }); })
        .catch(() => { if (alive) setResult({ restaurantId, coupons: [] }); });
    }
    return () => { alive = false; };
  }, [restaurantId, disabled]);
  return !disabled && restaurantId === result?.restaurantId ? result.coupons : [];
}
