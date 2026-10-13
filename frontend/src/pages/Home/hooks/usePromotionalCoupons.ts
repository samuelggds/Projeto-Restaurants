import { useEffect, useState } from 'react';
import { listPublicPromotionalCoupons } from '../../../Services/publicCouponsService';
import type { PublicPromotionalCoupon } from '../types';

export function usePromotionalCoupons(restaurantId: number | null, disabled: boolean) {
  const [coupons, setCoupons] = useState<PublicPromotionalCoupon[]>([]);
  useEffect(() => {
    let alive = true;
    setCoupons([]);
    if (restaurantId && !disabled) {
      void listPublicPromotionalCoupons(restaurantId)
        .then((items) => { if (alive) setCoupons(items); })
        .catch(() => { if (alive) setCoupons([]); });
    }
    return () => { alive = false; };
  }, [restaurantId, disabled]);
  return coupons;
}
