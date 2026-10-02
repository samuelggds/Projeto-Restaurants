import { describe, expect, it } from 'vitest';
import {
  hasUnalertedWaiterEvent,
  waiterAlertKeys,
} from './waiterAlertState';
import type { EmployeeWorkspaceData } from '../types';

const baseData: EmployeeWorkspaceData = {
  orders: [],
  tables: [],
  calls: [],
  accounts: [],
};

describe('waiterAlertState', () => {
  it('gera alerta para chamado novo e para pagamento em dinheiro pendente', () => {
    const data: EmployeeWorkspaceData = {
      ...baseData,
      calls: [
        {
          id: 'call-1',
          tableNumber: 1,
          type: 'WAITER',
          status: 'WAITING',
          elapsed: '00:01',
        },
      ],
      accounts: [
        {
          tableSessionId: '10',
          sessionPublicId: 'session-10',
          tableId: '1',
          tableNumber: 1,
          openedAt: '2030-01-01T12:00:00.000Z',
          status: 'OPEN',
          openedByName: 'Garçom',
          summary: {
            consumedCents: 1950,
            netPaidCents: 0,
            reservedCents: 1950,
            processingCents: 0,
            remainingCents: 1950,
            participantsCount: 1,
          },
          itemsCount: 1,
          paymentCounts: {
            reserved: 1,
            processing: 0,
            online: 0,
            inPerson: 1,
          },
          pendingManualPayments: [
            {
              publicId: 'cash-1',
              method: 'CASH',
              status: 'RESERVED',
              totalCents: 1950,
              createdAt: '2030-01-01T12:01:00.000Z',
            },
          ],
        },
      ],
    };

    expect(waiterAlertKeys(data)).toEqual(['call:call-1', 'cash:cash-1']);
    expect(hasUnalertedWaiterEvent(waiterAlertKeys(data), new Set())).toBe(true);
  });

  it('não toca de novo quando os mesmos eventos já foram avisados', () => {
    const keys = ['call:call-1', 'cash:cash-1'];
    expect(hasUnalertedWaiterEvent(keys, new Set(keys))).toBe(false);
  });

  it('ignora pagamento manual que não é dinheiro ou já terminou', () => {
    const data: EmployeeWorkspaceData = {
      ...baseData,
      accounts: [
        {
          tableSessionId: '10',
          sessionPublicId: 'session-10',
          tableId: '1',
          tableNumber: 1,
          openedAt: '2030-01-01T12:00:00.000Z',
          status: 'OPEN',
          openedByName: 'Garçom',
          summary: {
            consumedCents: 1950,
            netPaidCents: 1950,
            reservedCents: 0,
            processingCents: 0,
            remainingCents: 0,
            participantsCount: 1,
          },
          itemsCount: 1,
          paymentCounts: {
            reserved: 0,
            processing: 0,
            online: 0,
            inPerson: 0,
          },
          pendingManualPayments: [],
        },
      ],
    };

    expect(waiterAlertKeys(data)).toEqual([]);
  });
});
