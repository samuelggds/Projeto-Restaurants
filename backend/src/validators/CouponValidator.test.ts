import assert from 'node:assert/strict';
import test from 'node:test';
import { createCouponSchema, updateCouponSchema } from './CouponValidator.js';

test('normaliza o código e aplica padrões seguros ao cupom de fidelidade', () => {
  const parsed = createCouponSchema.parse({ code: '  cliente-10  ', discount: 10 });

  assert.equal(parsed.code, 'CLIENTE-10');
  assert.equal(parsed.discountType, 'FIXED');
  assert.equal(parsed.minimumSubtotal, 0);
  assert.equal(parsed.loyaltyPurchasesRequired, 1);
  assert.equal(parsed.perCustomerLimit, 1);
  assert.equal(parsed.redemptionValidityDays, 30);
  assert.equal(parsed.active, true);
  assert.equal(parsed.expiration, null);
});

test('rejeita percentual acima de 100 e requisitos de fidelidade inválidos', () => {
  const percentage = createCouponSchema.safeParse({
    code: 'FIDELIDADE',
    discountType: 'PERCENTAGE',
    discount: 120,
  });
  const purchases = createCouponSchema.safeParse({
    code: 'FIDELIDADE',
    discount: 10,
    loyaltyPurchasesRequired: 0,
  });
  const validity = createCouponSchema.safeParse({
    code: 'FIDELIDADE',
    discount: 10,
    redemptionValidityDays: 366,
  });

  assert.equal(percentage.success, false);
  assert.equal(purchases.success, false);
  assert.equal(validity.success, false);
});

test('aceita limpar validade e interpreta corretamente o booleano falso', () => {
  const parsed = updateCouponSchema.parse({ expiration: '', active: 'false' });

  assert.equal(parsed.expiration, null);
  assert.equal(parsed.active, false);
});
