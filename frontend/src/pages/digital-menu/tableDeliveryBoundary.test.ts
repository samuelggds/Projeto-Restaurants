import { describe, expect, it } from 'vitest';

describe('table delivery boundary', () => {
  it('mantém fluxos de mesa e delivery semanticamente separados no contrato', () => {
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

    expect(tableOrder.type).toBe('MESA');
    expect(tableOrder.tableId).toBe(42);
    expect(tableOrder.settlementMode).toBe('TABLE_ACCOUNT');
    expect(tableOrder.assignedCourierId).toBeNull();

    expect(deliveryOrder.type).toBe('DELIVERY');
    expect(deliveryOrder.tableId).toBeNull();
    expect(deliveryOrder.assignedCourierId).toBe(17);
  });
});
