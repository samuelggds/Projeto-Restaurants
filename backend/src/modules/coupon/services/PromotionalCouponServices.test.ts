import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import couponRepository from '../repositories/CouponRepository.js';
import { createCouponSchema, updateCouponSchema } from '../../../validators/CouponValidator.js';
import { CreateCouponService } from './CreateCouponService.js';
import { RedeemLoyaltyCouponService } from './RedeemLoyaltyCouponService.js';

test('cupons antigos continuam sendo recompensas de fidelidade', () => {
  assert.equal(createCouponSchema.parse({ code: 'ANTIGO', discount: 10 }).kind, 'LOYALTY');
});
test('rejeita cupom sem nenhuma modalidade e porcentagem acima do máximo', () => {
  assert.equal(createCouponSchema.safeParse({ code: 'CUPOM', discount: 10, kind: 'PROMOTIONAL', allowTable: false, allowPickup: false, allowDelivery: false }).success, false);
  assert.equal(createCouponSchema.safeParse({ code: 'CUPOM', discount: 100, discountType: 'PERCENTAGE' }).success, false);
  assert.equal(updateCouponSchema.safeParse({ usageLimit: 0 }).success, false);
});
const originalFindActiveById = couponRepository.findActiveById;
const originalFindByCode = couponRepository.findByCode;
const originalCreate = couponRepository.create;
afterEach(() => {
  couponRepository.findActiveById = originalFindActiveById;
  couponRepository.findByCode = originalFindByCode;
  couponRepository.create = originalCreate;
});
test('resgate de fidelidade nunca aceita promoção pública', async () => {
  couponRepository.findActiveById = async () => ({ id: 1, kind: 'PROMOTIONAL' });
  await assert.rejects(() => new RedeemLoyaltyCouponService().execute({ couponId: 1, userId: 4, restaurantId: 7 }), /fidelidade indisponível/);
});
test('criação de promoção preserva restaurantId confiável', async () => {
  couponRepository.findByCode = async (_code, restaurantId) => {
    assert.equal(restaurantId, 7);
    return null;
  };
  couponRepository.create = async (data) => {
    assert.equal(data.restaurantId, 7);
    assert.equal(data.kind, 'PROMOTIONAL');
    assert.equal(data.usageLimit, 10);
    return { ...data, id: 8 };
  };
  const result = await new CreateCouponService().execute({
    restaurantId: 7, code: ' PUBLICO10 ', kind: 'PROMOTIONAL', discount: 10, usageLimit: 10,
  });
  assert.equal(result.kind, 'PROMOTIONAL');
});
