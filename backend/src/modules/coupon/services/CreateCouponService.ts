import couponRepository from '../repositories/CouponRepository.js';
import { createCouponSchema } from '../../../validators/CouponValidator.js';
import { presentCoupon } from '../utils/couponPresenter.js';

type CreateCouponPayload = {
  code: string;
  discount: number;
  title?: string;
  description?: string;
  discountType?: 'FIXED' | 'PERCENTAGE';
  minimumSubtotal?: number;
  maxDiscount?: number | null;
  loyaltyPurchasesRequired?: number;
  perCustomerLimit?: number;
  redemptionValidityDays?: number;
  active?: boolean;
  expiration?: Date | string | null;
  restaurantId: number;
};

export class CreateCouponService {
  async execute(payload: CreateCouponPayload) {
    const { restaurantId, ...couponPayload } = payload;
    const parsed = createCouponSchema.parse(couponPayload);
    const exists = await couponRepository.findByCode(parsed.code, restaurantId);

    if (exists) {
      throw new Error('Já existe um cupom com este código neste restaurante.');
    }

    let coupon;
    try {
      coupon = await couponRepository.create({
        code: parsed.code,
        title: parsed.title || null,
        description: parsed.description || null,
        discountType: parsed.discountType,
        discount: parsed.discount,
        minimumSubtotal: parsed.minimumSubtotal,
        maxDiscount: parsed.maxDiscount,
        loyaltyPurchasesRequired: parsed.loyaltyPurchasesRequired,
        perCustomerLimit: parsed.perCustomerLimit,
        redemptionValidityDays: parsed.redemptionValidityDays,
        active: parsed.active,
        expiration: parsed.expiration,
        restaurantId,
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new Error('Já existe um cupom com este código neste restaurante.');
      }
      throw error;
    }

    return presentCoupon(coupon);
  }
}

export default new CreateCouponService();
