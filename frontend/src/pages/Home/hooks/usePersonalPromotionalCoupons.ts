import { useEffect, useState } from 'react';
import { listMyPromotionalCoupons } from '../../../Services/publicCouponsService';
import { usePromotionalCoupons } from './usePromotionalCoupons';
import type { WalletCampaign } from '../../Profile/domain/promotionalWallet';

type CurrentUser = { id?: number | string; role?: string } | null;

export function usePersonalPromotionalCoupons({
  restaurantId, mesaMode, user,
}: {
  restaurantId: number | null;
  mesaMode: boolean;
  user: CurrentUser;
}) {
  const publicCoupons = usePromotionalCoupons(restaurantId, mesaMode);
  const [result, setResult] = useState<{ restaurantId: number; userId: number; campaigns: WalletCampaign[] } | null>(null);

  useEffect(() => {
    let active = true;
    if (!restaurantId || mesaMode || user?.role !== 'CLIENTE') return () => { active = false; };
    const userId = Number(user.id);
    void listMyPromotionalCoupons(restaurantId).then((campaigns) => {
      if (!active) return;
      setResult({ restaurantId, userId, campaigns });
    }).catch(() => {
      if (active) setResult({ restaurantId, userId, campaigns: [] });
    });
    return () => { active = false; };
  }, [restaurantId, mesaMode, user?.id, user?.role]);

  if (user?.role !== 'CLIENTE') return publicCoupons;
  return result?.restaurantId === restaurantId && result?.userId === Number(user.id)
    ? result.campaigns.filter((coupon) => coupon.status === 'ACTIVE')
    : [];
}
