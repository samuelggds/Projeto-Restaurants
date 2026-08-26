import assert from 'node:assert/strict';
import test from 'node:test';
import {
  allocateDiscountAcrossUnitPrices,
  buildTableBillUnitSeeds,
  decimalMoneyToCents,
} from './tableBillItemPricing.js';

test('converte valores decimais em centavos sem arredondamento flutuante', () => {
  assert.equal(decimalMoneyToCents('29.90'), 2_990);
  assert.equal(decimalMoneyToCents('0.01'), 1);
  assert.equal(decimalMoneyToCents(10), 1_000);
  assert.throws(() => decimalMoneyToCents('1.001'), /duas casas/i);
  assert.throws(() => decimalMoneyToCents('-1.00'), /negativo/i);
});

test('distribui desconto por unidade e preserva exatamente o total', () => {
  const discounted = allocateDiscountAcrossUnitPrices([1_000, 1_000, 500], 501);

  assert.deepEqual(discounted, [799, 800, 400]);
  assert.equal(discounted.reduce((total, value) => total + value, 0), 1_999);
  assert.throws(() => allocateDiscountAcrossUnitPrices([100], 101), /maior que o subtotal/i);
});

test('cada quantidade vira uma unidade financeira com índice próprio', () => {
  const units = buildTableBillUnitSeeds(
    [
      { price: '10.00', quantity: 2 },
      { price: '5.00', quantity: 1 },
    ],
    '5.01',
  );

  assert.deepEqual(
    units.map(({ orderItemIndex, unitIndex }) => ({ orderItemIndex, unitIndex })),
    [
      { orderItemIndex: 0, unitIndex: 1 },
      { orderItemIndex: 0, unitIndex: 2 },
      { orderItemIndex: 1, unitIndex: 1 },
    ],
  );
  assert.equal(units.reduce((total, unit) => total + unit.unitPriceCents, 0), 1_999);
});
