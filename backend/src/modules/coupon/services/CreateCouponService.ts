import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import couponRepository from '../repositories/CouponRepository.js';
import { createCouponSchema } from '../../../validators/CouponValidator.js';
import { presentCoupon } from '../utils/couponPresenter.js';

type CreateCouponPayload = {
  code: string;
  discount: number;
  kind?: 'PROMOTIONAL' | 'LOYALTY';
  audience?: 'ALL' | 'AUTHENTICATED' | 'NEW_CUSTOMERS' | 'RETURNING_CUSTOMERS' | 'INACTIVE_CUSTOMERS' | 'SPECIFIC_CUSTOMERS';
  inactivityMonths?: number | null;
  recipientUserIds?: number[];
  usageLimit?: number | null;
  allowDelivery?: boolean;
  allowPickup?: boolean;
  allowTable?: boolean;
  title?: string;
  description?: string;
  discountType?: 'FIXED' | 'PERCENTAGE' | 'FREE_SHIPPING';
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

    const data = {
      code: parsed.code,
      kind: parsed.kind,
      audience: parsed.audience,
      inactivityMonths: parsed.inactivityMonths,
      usageLimit: parsed.usageLimit,
      allowDelivery: parsed.allowDelivery,
      allowPickup: parsed.allowPickup,
      allowTable: parsed.allowTable,
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
    };
    let coupon;
    try {
      if (parsed.audience === 'SPECIFIC_CUSTOMERS') {
        coupon = await withTenantDbContext(restaurantId, async (db) => {
          const recipients = [...new Set(parsed.recipientUserIds)];
          const count = await db.user.count({
            where: { restaurantId, id: { in: recipients }, role: 'CLIENTE', active: true,
              NOT: { email: { endsWith: '@gastronexa.local' } } },
          });
          if (count !== recipients.length) {
            throw new Error('Selecione apenas clientes cadastrados e autenticados deste restaurante.');
          }
          const created = await db.coupon.create({ data });
          await db.couponRecipient.createMany({
            data: recipients.map((userId) => ({ restaurantId, couponId: created.id, userId })),
          });
          return created;
        });
      } else {
        coupon = await couponRepository.create(data);
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new Error('Já existe um cupom com este código neste restaurante.');
      }
      throw error;
    }

    return presentCoupon(coupon);
  }
}

export default new CreateCouponService();
