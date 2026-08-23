import couponRepository from '../repositories/CouponRepository.js';
import { updateCouponSchema } from '../../../validators/CouponValidator.js';
import { presentCoupon } from '../utils/couponPresenter.js';

type UpdateCouponPayload = {
  id: number | string | string[];
  restaurantId: number | string;
  code?: string;
  title?: string;
  description?: string;
  discountType?: 'FIXED' | 'PERCENTAGE';
  discount?: number;
  minimumSubtotal?: number;
  maxDiscount?: number | null;
  loyaltyPurchasesRequired?: number;
  perCustomerLimit?: number;
  redemptionValidityDays?: number;
  active?: boolean;
  expiration?: Date | string | null;
};

class UpdateCouponService {
  async execute({ id, restaurantId, ...payload }: UpdateCouponPayload) {
    const normalizedId = Array.isArray(id) ? id[0] : id;
    const coupon = await couponRepository.findById(normalizedId, restaurantId);

    if (!coupon) {
      throw new Error('Cupom não encontrado');
    }

    const parsed = updateCouponSchema.parse(payload);
    const effectiveDiscountType = parsed.discountType || coupon.discountType || 'FIXED';
    const effectiveDiscount = parsed.discount ?? Number(coupon.discount);

    if (effectiveDiscountType === 'PERCENTAGE' && effectiveDiscount >= 100) {
      throw new Error('O desconto percentual deve ser menor que 100%.');
    }

    if (parsed.code && parsed.code !== coupon.code.toUpperCase()) {
      const duplicate = await couponRepository.findByCode(parsed.code, restaurantId);
      if (duplicate && duplicate.id !== coupon.id) {
        throw new Error('Já existe um cupom com este código neste restaurante.');
      }
    }

    const updated = await couponRepository.update(normalizedId, restaurantId, {
      ...parsed,
      ...(parsed.title !== undefined ? { title: parsed.title || null } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description || null } : {}),
    });

    if (!updated) {
      throw new Error('Cupom não encontrado');
    }

    return presentCoupon(updated);
  }
}

export default new UpdateCouponService();
