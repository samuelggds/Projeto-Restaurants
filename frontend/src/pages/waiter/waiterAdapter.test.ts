import { describe, expect, it } from 'vitest';
import { mapWaiterCalls, mapWaiterTables } from './waiterAdapter';

describe('waiterAdapter', () => {
  it('mapeia a sessão aberta sem expor o token administrativo do QR Code', () => {
    const [table] = mapWaiterTables([
      {
        id: 91,
        number: 12,
        token: 'secure-table-token',
        active: true,
        operational: {
          status: 'OCCUPIED',
          openSession: { id: 31, status: 'OPEN', openedAt: '2026-08-24T15:00:00.000Z' },
          guests: 3,
          total: 87.5,
        },
      },
    ]);

    expect(table).toMatchObject({
      id: '91',
      number: 12,
      status: 'OCCUPIED',
      sessionStatus: 'OPEN',
      sessionId: '31',
      guests: 3,
      total: 87.5,
    });
    expect(table).not.toHaveProperty('token');
    expect(table.openedAt).toMatch(/^\d{2}:\d{2}$/);
  });

  it('mantém como ocupada a mesa cuja conta foi solicitada', () => {
    const [table] = mapWaiterTables([
      {
        id: 91,
        number: 12,
        active: true,
        tableSessions: [
          {
            id: 32,
            status: 'CLOSING_REQUESTED',
            openedAt: '2026-08-24T15:00:00.000Z',
          },
        ],
      },
    ]);

    expect(table).toMatchObject({
      id: '91',
      status: 'OCCUPIED',
      sessionStatus: 'CLOSING_REQUESTED',
      sessionId: '32',
    });
    expect(table.openedAt).toMatch(/^\d{2}:\d{2}$/);
  });

  it('não inventa sessão e ignora mesas inativas ou inválidas', () => {
    expect(
      mapWaiterTables([
        { id: 1, number: 1, active: true },
        { id: 2, number: 2, active: false },
        { id: 3, number: 0, active: true },
      ]),
    ).toEqual([
      {
        id: '1',
        number: 1,
        status: 'FREE',
        sessionStatus: undefined,
        sessionId: undefined,
        guests: 0,
        total: 0,
        openedAt: undefined,
      },
    ]);
  });

  it('mapeia chamados reais e descarta tipos antigos de código', () => {
    const calls = mapWaiterCalls(
      [
        {
          id: 5,
          type: 'WAITER',
          status: 'IN_PROGRESS',
          requestedAt: '2026-08-24T15:00:00.000Z',
          table: { number: 8 },
          assignedTo: { name: 'Ana' },
        },
        {
          id: 6,
          type: 'ACCESS_CODE',
          status: 'WAITING',
          table: { number: 9 },
        },
      ],
      new Date('2026-08-24T15:02:30.000Z').getTime(),
    );

    expect(calls).toEqual([
      expect.objectContaining({
        id: '5',
        tableNumber: 8,
        type: 'WAITER',
        status: 'IN_PROGRESS',
        elapsed: '02:30',
        employeeName: 'Ana',
      }),
    ]);
  });
});
