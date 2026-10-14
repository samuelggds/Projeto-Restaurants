import api from './api';
import type { PublicPromotionalCoupon } from '../pages/Home/types';

export async function listPublicPromotionalCoupons(restaurantId: number): Promise<PublicPromotionalCoupon[]> {
  const response = await api.get('/coupons/public', { params: { restaurantId } });
  if (!Array.isArray(response.data)) return [];
  return response.data.flatMap((value: unknown) => {
    if (!value || typeof value !== 'object') return [];
    const coupon = value as Record<string, unknown>;
    if (coupon.kind !== 'PROMOTIONAL' || coupon.active !== true) return [];
    const id = Number(coupon.id);
    const discount = Number(coupon.discount);
    const code = String(coupon.code || '').trim();
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isFinite(discount) ||
        (coupon.discountType === 'FREE_SHIPPING' ? discount !== 0 : discount <= 0) ||
        !/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code)) return [];
    return [{
      id, code,
      title: String(coupon.title || code),
      description: String(coupon.description || ''),
      discountType: coupon.discountType === 'FREE_SHIPPING' ? 'FREE_SHIPPING' : coupon.discountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED',
      audience: coupon.audience === 'NEW_CUSTOMERS' || coupon.audience === 'RETURNING_CUSTOMERS' ? coupon.audience : 'ALL',
      discount, minimumSubtotal: Math.max(0, Number(coupon.minimumSubtotal) || 0),
      maxDiscount: coupon.maxDiscount == null ? null : Number(coupon.maxDiscount),
      expiration: coupon.expiration ? String(coupon.expiration) : null,
      allowDelivery: coupon.allowDelivery !== false,
      allowPickup: coupon.allowPickup !== false,
      allowTable: coupon.allowTable !== false,
    }];
  });
}
