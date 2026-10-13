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
  kind?: 'PROMOTIONAL' | 'LOYALTY';
  usageLimit?: number | null;
  allowDelivery?: boolean;
  allowPickup?: boolean;
  allowTable?: boolean;
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
    // Do not convert issued loyalty redemptions into public, unauthenticated coupons.
    if (parsed.kind && parsed.kind !== coupon.kind) {
      throw new Error('Não é permitido alterar o tipo de um cupom existente.');
    }
    if (parsed.usageLimit != null && parsed.usageLimit < coupon.usageCount) {
      throw new Error('O limite de utilizações não pode ser inferior às utilizações já registradas.');
    }
    const allowedDelivery = parsed.allowDelivery ?? coupon.allowDelivery;
    const allowedPickup = parsed.allowPickup ?? coupon.allowPickup;
    const allowedTable = parsed.allowTable ?? coupon.allowTable;
    if (!allowedDelivery && !allowedPickup && !allowedTable) {
      throw new Error('Habilite pelo menos uma modalidade para o cupom.');
    }
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
