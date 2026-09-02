import { describe, expect, it } from 'vitest';
import { normalizeAttendantWorkspace } from './attendantApi';

describe('normalizeAttendantWorkspace', () => {
  it('normaliza o contrato operacional e descarta dados fora da allowlist', () => {
    const result = normalizeAttendantWorkspace({
      generatedAt: '2026-09-02T12:00:00.000Z',
      orders: [
        {
          id: 'order-1',
          code: '#91',
          type: 'MESA',
          status: 'PRONTO',
          tableNumber: 8,
          customerName: '  Carla  ',
          createdAt: '2026-09-02T11:30:00.000Z',
          readyAt: '2026-09-02T11:55:00.000Z',
          address: 'não deve aparecer',
          total: 140,
          items: [{ quantity: 2, productName: 'Pizza', price: 70 }],
        },
      ],
      calls: [
        {
          id: 'call-1',
          tableNumber: 8,
          type: 'BILL',
          status: 'WAITING',
          assignedToName: null,
          requestedAt: '2026-09-02T11:58:00.000Z',
          assignedAt: null,
          resolvedAt: null,
        },
      ],
      tables: [
        {
          id: '8',
          tableNumber: 8,
          status: 'OPEN',
          openedAt: '2026-09-02T10:00:00.000Z',
          participantCount: 3,
          activeOrderCount: 1,
          activeCallCount: 1,
          sessionToken: 'não deve aparecer',
        },
      ],
    });

    expect(result.orders[0]).toEqual({
      id: 'order-1',
      code: '#91',
      type: 'MESA',
      status: 'PRONTO',
      tableNumber: 8,
      customerName: 'Carla',
      createdAt: '2026-09-02T11:30:00.000Z',
      readyAt: '2026-09-02T11:55:00.000Z',
      items: [{ quantity: 2, productName: 'Pizza' }],
    });
    expect(JSON.stringify(result)).not.toMatch(/não deve aparecer|sessionToken|address|total/u);
  });

  it('ignora registros sem identidade operacional e mantém fallback seguro', () => {
    const result = normalizeAttendantWorkspace({
      orders: [{ id: '', createdAt: 'inválido' }],
      calls: [{ id: '1', tableNumber: 0, requestedAt: 'inválido' }],
      tables: [{ tableNumber: 0, openedAt: 'inválido' }],
    });

    expect(result).toEqual({ generatedAt: '', orders: [], calls: [], tables: [] });
  });
});
