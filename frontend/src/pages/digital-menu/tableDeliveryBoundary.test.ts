import assert from 'node:assert/strict';
import test from 'node:test';

test('fluxos de mesa e delivery permanecem semanticamente separados no contrato', () => {
  const tableOrder = {
    type: 'MESA',
    tableId: 42,
    settlementMode: 'TABLE_ACCOUNT',
    assignedCourierId: null,
  };
  const deliveryOrder = {
    type: 'DELIVERY',
    tableId: null,
    settlementMode: null,
    assignedCourierId: 17,
  };

  assert.equal(tableOrder.type, 'MESA');
  assert.equal(tableOrder.tableId, 42);
  assert.equal(tableOrder.settlementMode, 'TABLE_ACCOUNT');
  assert.equal(tableOrder.assignedCourierId, null);

  assert.equal(deliveryOrder.type, 'DELIVERY');
  assert.equal(deliveryOrder.tableId, null);
  assert.equal(deliveryOrder.assignedCourierId, 17);
});
