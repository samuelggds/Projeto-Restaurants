import test from 'node:test';
import assert from 'node:assert/strict';
import { OrderType } from '@prisma/client';
import { createOrderSchema } from './OrderValidator.js';

const baseOrder = {
  restaurantId: 7,
  type: OrderType.RETIRADA,
  items: [{ productId: 10, quantity: 1 }],
};

test('aceita montagem agrupada e normaliza a observação do item', () => {
  const result = createOrderSchema.parse({
    ...baseOrder,
    items: [
      {
        productId: 10,
        quantity: 1,
        optionIds: [1001, 2001],
        selectedOptions: [
          { groupId: 100, optionIds: [1001] },
          { groupId: 200, optionIds: [2001] },
        ],
        observation: '  deixar bem assado  ',
      },
    ],
  });

  assert.equal(result.items[0].observation, 'deixar bem assado');
  assert.deepEqual(result.items[0].selectedOptions, [
    { groupId: 100, optionIds: [1001] },
    { groupId: 200, optionIds: [2001] },
  ]);
});

test('rejeita observação acima do limite operacional', () => {
  const result = createOrderSchema.safeParse({
    ...baseOrder,
    items: [{ productId: 10, quantity: 1, observation: 'x'.repeat(501) }],
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0]?.message || '', /no máximo 500 caracteres/);
  }
});

test('aceita somente um identificador de cupom resgatado por pedido', () => {
  const oneCoupon = createOrderSchema.safeParse({
    ...baseOrder,
    couponRedemptionId: 91,
  });
  const multipleCoupons = createOrderSchema.safeParse({
    ...baseOrder,
    couponRedemptionId: [91, 92],
  });

  assert.equal(oneCoupon.success, true);
  assert.equal(multipleCoupons.success, false);
});
