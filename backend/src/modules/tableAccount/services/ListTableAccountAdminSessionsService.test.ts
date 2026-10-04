// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import tableAccountRepository from '../repositories/TableAccountRepository.js';
import {
  ListTableAccountAdminSessionsService,
  resolveManualPaymentOrderPublicIds,
} from './ListTableAccountAdminSessionsService.js';

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
  events = [],
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
    payerParticipant: { publicId: 'participant-1' },
    events,
    allocations: [],
  };
}

test('lista somente dinheiro ativo e mantém consultas no restaurante do garçom', async () => {
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
        participants: [
          {
            publicId: 'participant-1',
            displayName: 'Samuel',
            userId: null,
            status: 'ACTIVE',
            tokenExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
            joinedAt: new Date('2026-08-26T17:00:00.000Z'),
            leftAt: null,
          },
        ],
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
            publicId: 'cash-received',
            method: 'CASH',
            status: 'RESERVED',
            expiresAt: new Date('2020-01-01T00:00:00.000Z'),
            events: [
              {
                deduplicationKey:
                  'table-payment:cash-received:cash-received-by-staff',
              },
            ],
          }),
          payment({
            publicId: 'pix-online',
            method: 'PIX',
            status: 'PROCESSING',
            provider: 'MERCADO_PAGO',
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
      payerParticipantPublicId: 'participant-1',
      payerDisplayName: 'Samuel',
      staffReceiptRegistered: false,
      orderPublicIds: [],
    },
    {
      publicId: 'cash-received',
      method: 'CASH',
      status: 'RESERVED',
      totalCents: 2_900,
      createdAt: '2026-08-26T18:00:00.000Z',
      payerParticipantPublicId: 'participant-1',
      payerDisplayName: 'Samuel',
      staffReceiptRegistered: true,
      orderPublicIds: [],
    },
  ]);
  assert.equal(result.sessions[0]?.paymentCounts.inPerson, 4);
  assert.equal(queryCount, 1);
});


test('resolve pedidos ligados ao pagamento manual sem misturar itens não alocados', () => {
  const result = resolveManualPaymentOrderPublicIds(
    [
      { publicId: 'item-a1', orderPublicId: 'order-a' },
      { publicId: 'item-a2', orderPublicId: 'order-a' },
      { publicId: 'item-b1', orderPublicId: 'order-b' },
    ],
    [
      { tableBillItem: { publicId: 'item-a1' } },
      { tableBillItem: { publicId: 'item-a2' } },
    ],
  );

  assert.deepEqual(result, ['order-a']);
});
