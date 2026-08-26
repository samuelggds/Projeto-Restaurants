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

test('limita quantidade por item antes de criar unidades financeiras', () => {
  const result = createOrderSchema.safeParse({
    ...baseOrder,
    items: [{ productId: 10, quantity: 100_000_000 }],
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0]?.message || '', /quantidade máxima por item/i);
  }
});

test('limita a quantidade total mesmo com vários itens válidos', () => {
  const result = createOrderSchema.safeParse({
    ...baseOrder,
    items: [
      { productId: 10, quantity: 100 },
      { productId: 11, quantity: 100 },
      { productId: 12, quantity: 1 },
    ],
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => /200 unidades/i.test(issue.message)));
  }
});

test('aceita pedido de mesa sem telefone e normaliza uma string vazia', () => {
  const result = createOrderSchema.safeParse({
    ...baseOrder,
    type: OrderType.MESA,
    tableId: 12,
    customerPhone: '   ',
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.customerPhone, undefined);
  }
});

test('rejeita telefone opcional quando ele é informado sem DDD válido', () => {
  const result = createOrderSchema.safeParse({
    ...baseOrder,
    type: OrderType.MESA,
    tableId: 12,
    customerPhone: '12345',
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0]?.message || '', /celular\/WhatsApp válido com DDD/i);
  }
});
