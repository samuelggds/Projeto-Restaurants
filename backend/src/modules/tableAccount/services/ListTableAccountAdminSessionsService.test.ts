// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import tableAccountRepository from '../repositories/TableAccountRepository.js';
import { ListTableAccountAdminSessionsService } from './ListTableAccountAdminSessionsService.js';

const originals = {
  listAdminSnapshotDataByRestaurant: tableAccountRepository.listAdminSnapshotDataByRestaurant,
};

afterEach(() => {
  tableAccountRepository.listAdminSnapshotDataByRestaurant =
    originals.listAdminSnapshotDataByRestaurant;
});

function payment({
  publicId,
  method,
  status,
  expiresAt = new Date('2099-01-01T00:10:00.000Z'),
  provider = null,
  providerExternalId = null,
}) {
  return {
    publicId,
    method,
    status,
    selectionMode: 'WAITER',
    provider,
    providerExternalId,
    totalCents: 2_900n,
    serviceFeeCents: 0n,
    expiresAt,
    createdAt: new Date('2026-08-26T18:00:00.000Z'),
  };
}

test('lista somente pagamentos presenciais ativos e mantém consultas no restaurante do garçom', async () => {
  let queryCount = 0;
  tableAccountRepository.listAdminSnapshotDataByRestaurant = async (restaurantId, now) => {
    queryCount += 1;
    assert.equal(restaurantId, 7);
    assert.ok(now instanceof Date);
    return [
      {
        id: 55,
        publicId: 'session-public-55',
        restaurantId,
        tableId: 91,
        table: { number: 12 },
        openedAt: new Date('2026-08-26T17:00:00.000Z'),
        expiresAt: null,
        status: 'OPEN',
        openedBy: { name: 'Ana Garçom' },
        participants: [],
        billItems: [],
        paymentIntents: [
          payment({ publicId: 'cash-active', method: 'CASH', status: 'RESERVED' }),
          payment({ publicId: 'machine-active', method: 'CARD_MACHINE', status: 'PROCESSING' }),
          payment({
            publicId: 'cash-expired',
            method: 'CASH',
            status: 'RESERVED',
            expiresAt: new Date('2020-01-01T00:00:00.000Z'),
          }),
          payment({
            publicId: 'pix-online',
            method: 'PIX',
            status: 'PROCESSING',
            provider: 'PAGBANK',
            providerExternalId: 'charge-1',
          }),
          payment({ publicId: 'cash-paid', method: 'CASH', status: 'PAID' }),
        ],
      },
    ];
  };

  const result = await new ListTableAccountAdminSessionsService().execute({
    id: 31,
    role: 'FUNCIONARIO',
    subRole: 'GARCOM',
    restaurantId: 7,
  });

  assert.deepEqual(result.sessions[0]?.pendingManualPayments, [
    {
      publicId: 'cash-active',
      method: 'CASH',
      status: 'RESERVED',
      totalCents: 2_900,
      createdAt: '2026-08-26T18:00:00.000Z',
    },
    {
      publicId: 'machine-active',
      method: 'CARD_MACHINE',
      status: 'PROCESSING',
      totalCents: 2_900,
      createdAt: '2026-08-26T18:00:00.000Z',
    },
  ]);
  assert.equal(queryCount, 1);
});
