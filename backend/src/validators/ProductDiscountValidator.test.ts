import assert from 'node:assert/strict';
import test from 'node:test';
import { upsertProductDiscountSchema } from './ProductDiscountValidator.js';

test('aceita desconto fixo com vigência e aviso opcional', () => {
  const parsed = upsertProductDiscountSchema.parse({
    kind: 'FIXED',
    value: '12.50',
    label: 'Oferta de hoje',
    startsAt: '2026-08-23T12:00:00.000Z',
    endsAt: '2026-08-24T12:00:00.000Z',
  });

  assert.equal(parsed.value, 12.5);
  assert.equal(parsed.active, true);
  assert.equal(parsed.label, 'Oferta de hoje');
});

test('rejeita percentual acima de 100 e período invertido', () => {
  const parsed = upsertProductDiscountSchema.safeParse({
    kind: 'PERCENTAGE',
    value: 101,
    startsAt: '2026-08-24T12:00:00.000Z',
    endsAt: '2026-08-23T12:00:00.000Z',
  });

  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.deepEqual(
      parsed.error.issues.map((issue) => issue.path[0]),
      ['value', 'endsAt'],
    );
  }
});
