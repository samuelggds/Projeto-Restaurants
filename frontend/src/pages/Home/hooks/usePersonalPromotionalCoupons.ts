import { useEffect, useState } from 'react';
import { listMyPromotionalCoupons } from '../../../Services/publicCouponsService';
import { usePromotionalCoupons } from './usePromotionalCoupons';
import type { WalletCampaign } from '../../Profile/domain/promotionalWallet';

type CurrentUser = { id?: number | string; role?: string } | null;

export function usePersonalPromotionalCoupons({
  restaurantId, mesaMode, user, notify,
}: {
  restaurantId: number | null;
  mesaMode: boolean;
  user: CurrentUser;
  notify: (type: 'info', title: string, message: string, duration?: number) => void;
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
      const exclusive = campaigns.filter((campaign) => campaign.status === 'ACTIVE' && campaign.audience !== 'ALL');
      if (exclusive.length) {
        const key = 'gastronexa:coupon-notice:' + restaurantId + ':' + userId;
        const fingerprint = exclusive.map((campaign) => campaign.id).sort().join(',');
        if (window.sessionStorage.getItem(key) !== fingerprint) {
          window.sessionStorage.setItem(key, fingerprint);
          notify('info', 'Você recebeu cupons!', 'Há ' + exclusive.length + ' benefício(s) ativo(s) em Minha conta → Meus Cupons.', 6000);
        }
      }
    }).catch(() => {
      if (active) setResult({ restaurantId, userId, campaigns: [] });
    });
    return () => { active = false; };
  }, [restaurantId, mesaMode, user?.id, user?.role, notify]);

  if (user?.role !== 'CLIENTE') return publicCoupons;
  return result?.restaurantId === restaurantId && result?.userId === Number(user.id)
    ? result.campaigns.filter((coupon) => coupon.status === 'ACTIVE')
    : [];
}
