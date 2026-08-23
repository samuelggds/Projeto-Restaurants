import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveProductBasePricing } from './productDiscount.js';

const now = new Date('2026-08-23T12:00:00.000Z');

test('aplica percentual vigente e devolve pricing público autoritativo', () => {
  const pricing = resolveProductBasePricing(
    {
      price: 50,
      discount: {
        kind: 'PERCENTAGE',
        value: 20,
        label: 'Oferta do almoço',
        active: true,
        startsAt: '2026-08-23T10:00:00.000Z',
        endsAt: '2026-08-23T14:00:00.000Z',
      },
    },
    now,
  );

  assert.equal(pricing.originalBasePrice, 50);
  assert.equal(pricing.effectiveBasePrice, 40);
  assert.equal(pricing.discountAmount, 10);
  assert.equal(pricing.discountPercentage, 20);
  assert.equal(pricing.badgeLabel, 'Oferta do almoço');
  assert.equal(pricing.active, true);
});

test('ignora promoção agendada, expirada ou desativada', () => {
  for (const discount of [
    { kind: 'FIXED', value: 10, active: false },
    { kind: 'FIXED', value: 10, active: true, startsAt: '2026-08-24T00:00:00.000Z' },
    { kind: 'FIXED', value: 10, active: true, endsAt: '2026-08-23T11:59:59.000Z' },
  ]) {
    const pricing = resolveProductBasePricing({ price: 50, discount }, now);
    assert.equal(pricing.effectiveBasePrice, 50);
    assert.equal(pricing.discountAmount, 0);
    assert.equal(pricing.active, false);
  }
});

test('limita desconto fixo ao preço-base sem afetar valores negativos', () => {
  const pricing = resolveProductBasePricing(
    { price: 30, discount: { kind: 'FIXED', value: 50, active: true } },
    now,
  );
  assert.equal(pricing.effectiveBasePrice, 0);
  assert.equal(pricing.discountAmount, 30);
  assert.equal(pricing.discountPercentage, 100);
});

