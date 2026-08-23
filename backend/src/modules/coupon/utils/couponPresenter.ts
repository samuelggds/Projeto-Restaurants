type CouponLike = {
  id: number;
  restaurantId: number;
  code: string;
  title?: string | null;
  description?: string | null;
  discountType?: 'FIXED' | 'PERCENTAGE' | string;
  discount: unknown;
  minimumSubtotal?: unknown;
  maxDiscount?: unknown;
  loyaltyPurchasesRequired?: number;
  perCustomerLimit?: number;
  redemptionValidityDays?: number;
  active: boolean;
  expiration?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableIsoDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function presentCoupon(coupon: CouponLike) {
  const code = String(coupon.code || '')
    .trim()
    .toUpperCase();

  return {
    id: coupon.id,
    restaurantId: coupon.restaurantId,
    code,
    title: coupon.title?.trim() || code,
    description: coupon.description?.trim() || '',
    discountType: coupon.discountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED',
    discount: Number(coupon.discount || 0),
    minimumSubtotal: Number(coupon.minimumSubtotal || 0),
    maxDiscount: nullableNumber(coupon.maxDiscount),
    loyaltyPurchasesRequired: Number(coupon.loyaltyPurchasesRequired || 1),
    perCustomerLimit: Number(coupon.perCustomerLimit || 1),
    redemptionValidityDays: Number(coupon.redemptionValidityDays || 30),
    active: coupon.active,
    expiration: nullableIsoDate(coupon.expiration),
    ...(coupon.createdAt ? { createdAt: nullableIsoDate(coupon.createdAt) } : {}),
    ...(coupon.updatedAt ? { updatedAt: nullableIsoDate(coupon.updatedAt) } : {}),
  };
}
