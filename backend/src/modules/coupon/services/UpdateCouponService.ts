import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import couponRepository from '../repositories/CouponRepository.js';
import { updateCouponSchema } from '../../../validators/CouponValidator.js';
import { presentCoupon } from '../utils/couponPresenter.js';

type UpdateCouponPayload = {
  id: number | string | string[];
  restaurantId: number | string;
  code?: string;
  title?: string;
  description?: string;
  discountType?: 'FIXED' | 'PERCENTAGE' | 'FREE_SHIPPING';
  discount?: number;
  kind?: 'PROMOTIONAL' | 'LOYALTY';
  audience?: 'ALL' | 'AUTHENTICATED' | 'NEW_CUSTOMERS' | 'RETURNING_CUSTOMERS' | 'INACTIVE_CUSTOMERS' | 'SPECIFIC_CUSTOMERS';
  inactivityMonths?: number | null;
  recipientUserIds?: number[];
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
    const effectiveAudience = parsed.audience ?? coupon.audience ?? 'ALL';
    const effectiveDiscount = parsed.discount ?? Number(coupon.discount);

    if (coupon.kind !== 'PROMOTIONAL' && effectiveAudience !== 'ALL') {
      throw new Error('Público-alvo de primeira compra é exclusivo para cupons promocionais.');
    }
    if (effectiveDiscountType === 'FREE_SHIPPING') {
      if (coupon.kind !== 'PROMOTIONAL' || !allowedDelivery || allowedPickup || allowedTable) {
        throw new Error('Frete grátis só pode ser usado em campanhas promocionais de Delivery.');
      }
      if (effectiveDiscount !== 0) {
        throw new Error('Frete grátis não pode descontar valores dos produtos.');
      }
    } else if (effectiveDiscount <= 0) {
      throw new Error('Informe um desconto maior que zero.');
    }
    if (effectiveDiscountType === 'PERCENTAGE' && effectiveDiscount >= 100) {
      throw new Error('O desconto percentual deve ser menor que 100%.');
    }

    if (parsed.code && parsed.code !== coupon.code.toUpperCase()) {
      const duplicate = await couponRepository.findByCode(parsed.code, restaurantId);
      if (duplicate && duplicate.id !== coupon.id) {
        throw new Error('Já existe um cupom com este código neste restaurante.');
      }
    }

    const { recipientUserIds, ...couponUpdate } = parsed;
    const updated = await withTenantDbContext(Number(restaurantId), async (db) => {
      if (recipientUserIds && (effectiveAudience === 'SPECIFIC_CUSTOMERS')) {
        const count = await db.user.count({ where: { id: { in: recipientUserIds }, restaurantId: Number(restaurantId), role: 'CLIENTE', active: true } });
        if (count !== new Set(recipientUserIds).size) throw new Error('Destinatários inválidos.');
      }
      const result = await db.coupon.updateMany({ where: { id: Number(normalizedId), restaurantId: Number(restaurantId) }, data: {
      ...couponUpdate,
      ...(parsed.title !== undefined ? { title: parsed.title || null } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description || null } : {}),
      } });
      if (!result.count) return null;
      if (recipientUserIds || (parsed.audience && parsed.audience !== 'SPECIFIC_CUSTOMERS')) {
        await db.couponRecipient.deleteMany({ where: { couponId: Number(normalizedId), restaurantId: Number(restaurantId) } });
        if (effectiveAudience === 'SPECIFIC_CUSTOMERS' && recipientUserIds?.length) await db.couponRecipient.createMany({ data: [...new Set(recipientUserIds)].map((userId) => ({ couponId: Number(normalizedId), restaurantId: Number(restaurantId), userId })) });
      }
      return db.coupon.findFirst({ where: { id: Number(normalizedId), restaurantId: Number(restaurantId) } });
    });

    if (!updated) {
      throw new Error('Cupom não encontrado');
    }

    return presentCoupon(updated);
  }
}

export default new UpdateCouponService();
