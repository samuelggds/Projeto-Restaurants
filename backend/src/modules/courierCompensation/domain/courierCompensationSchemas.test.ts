import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compensationPolicySchema,
  createSettlementSchema,
  disputeSettlementSchema,
} from './courierCompensationSchemas.js';

test('restaurantId enviado no body nunca participa da regra persistida', () => {
  const parsed = compensationPolicySchema.parse({
    restaurantId: 999,
    model: 'FIXED_PER_DELIVERY',
    fixedAmount: 8,
  });
  assert.equal('restaurantId' in parsed, false);
});

test('restaurantId enviado no acerto é descartado e tenant vem da sessão', () => {
  const parsed = createSettlementSchema.parse({
    restaurantId: 999,
    courierId: 4,
    orderIds: [1, 2],
  });
  assert.equal('restaurantId' in parsed, false);
  assert.deepEqual(parsed.orderIds, [1, 2]);
});

test('acerto limita quantidade e exige ids positivos', () => {
  assert.throws(() => createSettlementSchema.parse({ courierId: 1, orderIds: [] }));
  assert.throws(() => createSettlementSchema.parse({ courierId: 1, orderIds: [-1] }));
  assert.throws(() =>
    createSettlementSchema.parse({
      courierId: 1,
      orderIds: Array.from({ length: 201 }, (_, i) => i + 1),
    }),
  );
});

test('divergência exige justificativa útil e limita tamanho', () => {
  assert.throws(() => disputeSettlementSchema.parse({ reason: 'não' }));
  assert.throws(() => disputeSettlementSchema.parse({ reason: 'x'.repeat(501) }));
  assert.equal(
    disputeSettlementSchema.parse({ reason: 'Pedido 18 não confere' }).reason,
    'Pedido 18 não confere',
  );
});
