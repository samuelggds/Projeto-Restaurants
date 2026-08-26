// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import tableAccountRepository from '../repositories/TableAccountRepository.js';
import tableAccountSettingsRepository from '../repositories/TableAccountSettingsRepository.js';
import {
  GetCurrentTableAccountService,
  TableAccountAccessError,
} from './GetCurrentTableAccountService.js';

const originalFindSnapshotData = tableAccountRepository.findSnapshotData;
const originalFindSettings = tableAccountSettingsRepository.findByRestaurantId;

const defaultCapabilities = {
  enabled: true,
  requirePrepaymentAboveCents: null,
  prepaymentWindows: [],
  allowCash: true,
  allowCardMachine: true,
  allowOnlinePayment: true,
  allowSplit: true,
  serviceFeeMode: 'OPTIONAL' as const,
  serviceFeeBasisPoints: 1_000,
  preventCloseWithOutstandingBalance: true,
  requireEmployeeApprovalForPreparedItemCancellation: true,
  blockNewOrdersOnClosingRequest: true,
  reservationTimeoutMinutes: 10,
  timeZone: 'America/Sao_Paulo',
};

tableAccountSettingsRepository.findByRestaurantId = async () => defaultCapabilities;

afterEach(() => {
  tableAccountRepository.findSnapshotData = originalFindSnapshotData;
  tableAccountSettingsRepository.findByRestaurantId = async () => defaultCapabilities;
});

const currentParticipantPublicId = '123e4567-e89b-42d3-a456-426614174001';

function billItem({
  publicId,
  price,
  financialStatus = 'UNPAID',
  orderStatus = 'PENDENTE',
  paid = false,
  refundStatus = 'NONE',
  canceledAt = null,
  participantPublicId = currentParticipantPublicId,
  displayName = 'Samuel',
  paymentAllocations = [],
}) {
  return {
    publicId,
    productName: `Produto ${publicId}`,
    unitIndex: 1,
    unitPriceCents: BigInt(price),
    financialStatus,
    canceledAt,
    order: {
      publicId: `223e4567-e89b-42d3-a456-4266141740${publicId}`,
      status: orderStatus,
      paid,
      refundStatus,
      // Mesmo que uma consulta futura retorne algo a mais, o DTO público não pode vazar isso.
      paymentMethod: 'PIX',
      customerCpf: '00000000000',
    },
    participant: {
      publicId: participantPublicId,
      displayName,
      user: { email: 'privado@example.com' },
    },
    paymentAllocations,
  };
}

test('monta a conta com centavos exatos, ignora cancelados e não expõe dados de pagamento', async () => {
  tableAccountRepository.findSnapshotData = async (sessionId, restaurantId, participantId) => {
    assert.deepEqual([sessionId, restaurantId, participantId], [55, 7, 80]);
    return {
      publicId: '323e4567-e89b-42d3-a456-426614174001',
      status: 'OPEN',
      table: { number: 12 },
      participants: [
        {
          publicId: currentParticipantPublicId,
          displayName: 'Samuel',
          status: 'ACTIVE',
          joinedAt: new Date('2026-08-25T12:00:00.000Z'),
          leftAt: null,
          phone: '85999999999',
        },
        {
          publicId: '123e4567-e89b-42d3-a456-426614174002',
          displayName: null,
          status: 'LEFT',
          joinedAt: new Date('2026-08-25T12:01:00.000Z'),
          leftAt: new Date('2026-08-25T12:30:00.000Z'),
        },
      ],
      billItems: [
        billItem({ publicId: '01', price: 1_000 }),
        billItem({ publicId: '02', price: 250, paid: true, financialStatus: 'UNPAID' }),
        billItem({
          publicId: '03',
          price: 400,
          financialStatus: 'PAID',
          refundStatus: 'SUCCEEDED',
          canceledAt: new Date('2026-08-25T12:20:00.000Z'),
        }),
        billItem({ publicId: '04', price: 300, financialStatus: 'RESERVED' }),
        billItem({ publicId: '05', price: 200, financialStatus: 'PROCESSING' }),
        billItem({
          publicId: '06',
          price: 500,
          orderStatus: 'CANCELADO',
          displayName: null,
        }),
      ],
    };
  };

  const result = await new GetCurrentTableAccountService().execute({
    tableSessionId: 55,
    restaurantId: 7,
    participantId: 80,
    participantPublicId: currentParticipantPublicId,
  });

  assert.deepEqual(result.summary, {
    sessionPublicId: '323e4567-e89b-42d3-a456-426614174001',
    tableNumber: 12,
    status: 'OPEN',
    consumedCents: 1_750,
    serviceFeeCents: 0,
    grossPaidCents: 650,
    refundedCents: 400,
    netPaidCents: 250,
    reservedCents: 300,
    processingCents: 200,
    remainingCents: 1_500,
    overpaidCents: 0,
    participantsCount: 1,
  });
  assert.equal(result.contractVersion, 1);
  assert.equal(result.currentParticipantPublicId, currentParticipantPublicId);
  assert.deepEqual(result.capabilities, {
    enabled: true,
    allowCash: true,
    allowCardMachine: true,
    allowOnlinePayment: true,
    allowSplit: true,
    serviceFeeMode: 'OPTIONAL',
    serviceFeeBasisPoints: 1_000,
    reservationTimeoutMinutes: 10,
  });
  assert.deepEqual(result.payments, []);
  assert.equal(result.items[1].financialStatus, 'PAID');
  assert.equal(result.items[2].financialStatus, 'REFUNDED');
  assert.equal(result.items[5].orderStatus, 'CANCELED');
  assert.equal(result.items[5].orderedByDisplayName, 'Cliente da mesa');
  assert.equal(result.participants[1].leftAt, '2026-08-25T12:30:00.000Z');

  const publicPayload = JSON.stringify(result);
  assert.doesNotMatch(publicPayload, /paymentMethod|customerCpf|privado@example\.com|85999999999/);
});

test('mantém o acesso preso à combinação de sessão, restaurante e participante', async () => {
  tableAccountRepository.findSnapshotData = async (sessionId, restaurantId, participantId) => {
    assert.deepEqual([sessionId, restaurantId, participantId], [55, 7, 999]);
    return null;
  };

  await assert.rejects(
    () =>
      new GetCurrentTableAccountService().execute({
        tableSessionId: 55,
        restaurantId: 7,
        participantId: 999,
        participantPublicId: currentParticipantPublicId,
      }),
    (error) =>
      error instanceof TableAccountAccessError && error.message === 'Conta da mesa não encontrada.',
  );
});

test('taxa de pagamento estornado permanece no histórico sem voltar ao saldo devido', async () => {
  const paidAt = new Date('2026-08-25T13:00:00.000Z');
  const refundedAt = new Date('2026-08-25T13:30:00.000Z');
  tableAccountRepository.findSnapshotData = async () => ({
    publicId: '323e4567-e89b-42d3-a456-426614174001',
    status: 'OPEN',
    table: { number: 12 },
    participants: [
      {
        publicId: currentParticipantPublicId,
        displayName: 'Samuel',
        status: 'ACTIVE',
        joinedAt: new Date('2026-08-25T12:00:00.000Z'),
        leftAt: null,
      },
    ],
    billItems: [
      billItem({
        publicId: '11',
        price: 100,
        paid: true,
        financialStatus: 'PAID',
        paymentAllocations: [
          { amountCents: 100n, paymentIntent: { status: 'PAID', expiresAt: paidAt } },
        ],
      }),
      billItem({
        publicId: '12',
        price: 200,
        financialStatus: 'REFUNDED',
        refundStatus: 'SUCCEEDED',
        canceledAt: refundedAt,
        paymentAllocations: [
          { amountCents: 200n, paymentIntent: { status: 'REFUNDED', expiresAt: paidAt } },
        ],
      }),
    ],
    paymentIntents: [
      {
        publicId: '423e4567-e89b-42d3-a456-426614174011',
        status: 'PAID',
        subtotalCents: 100n,
        serviceFeeCents: 10n,
        totalCents: 110n,
        expiresAt: paidAt,
        createdAt: paidAt,
        selectionMode: 'MY_ITEMS',
        payerParticipant: { publicId: currentParticipantPublicId },
      },
      {
        publicId: '423e4567-e89b-42d3-a456-426614174012',
        status: 'REFUNDED',
        subtotalCents: 200n,
        serviceFeeCents: 20n,
        totalCents: 220n,
        expiresAt: paidAt,
        createdAt: paidAt,
        payerParticipant: { publicId: currentParticipantPublicId },
        selectionMode: 'SELECTED_ITEMS',
      },
    ],
  });

  const result = await new GetCurrentTableAccountService().execute({
    tableSessionId: 55,
    restaurantId: 7,
    participantId: 80,
    participantPublicId: currentParticipantPublicId,
  });

  assert.equal(result.summary.consumedCents, 100);
  assert.equal(result.summary.serviceFeeCents, 10);
  assert.equal(result.summary.grossPaidCents, 330);
  assert.equal(result.summary.refundedCents, 220);
  assert.equal(result.summary.netPaidCents, 110);
  assert.equal(result.summary.remainingCents, 0);
});

test('não conta convidado expirado como acesso ativo e preserva o registro no histórico', async () => {
  tableAccountRepository.findSnapshotData = async () => ({
    publicId: '323e4567-e89b-42d3-a456-426614174001',
    status: 'OPEN',
    table: { number: 12 },
    participants: [
      {
        publicId: currentParticipantPublicId,
        userId: null,
        displayName: 'Convidado atual',
        status: 'ACTIVE',
        tokenExpiresAt: new Date('2099-08-25T13:00:00.000Z'),
        joinedAt: new Date('2026-08-25T12:00:00.000Z'),
        leftAt: null,
      },
      {
        publicId: '123e4567-e89b-42d3-a456-426614174099',
        userId: null,
        displayName: 'Acesso expirado',
        status: 'ACTIVE',
        tokenExpiresAt: new Date('2026-08-25T11:00:00.000Z'),
        joinedAt: new Date('2026-08-25T10:00:00.000Z'),
        leftAt: null,
      },
      {
        publicId: '123e4567-e89b-42d3-a456-426614174098',
        userId: 80,
        displayName: 'Cliente autenticado',
        status: 'ACTIVE',
        tokenExpiresAt: null,
        joinedAt: new Date('2026-08-25T12:10:00.000Z'),
        leftAt: null,
      },
    ],
    billItems: [],
    paymentIntents: [],
  });

  const result = await new GetCurrentTableAccountService().execute({
    tableSessionId: 55,
    restaurantId: 7,
    participantId: 80,
    participantPublicId: currentParticipantPublicId,
  });

  assert.equal(result.summary.participantsCount, 2);
  assert.equal(result.participants[0].status, 'ACTIVE');
  assert.equal(result.participants[1].status, 'LEFT');
  assert.equal(result.participants[1].displayName, 'Acesso expirado');
  assert.equal(result.participants[2].status, 'ACTIVE');
});

test('rejeita identificadores inválidos antes de consultar o repositório', async () => {
  let repositoryCalled = false;
  tableAccountRepository.findSnapshotData = async () => {
    repositoryCalled = true;
    return null;
  };

  await assert.rejects(
    () =>
      new GetCurrentTableAccountService().execute({
        tableSessionId: 0,
        restaurantId: 7,
        participantId: 80,
        participantPublicId: currentParticipantPublicId,
      }),
    TableAccountAccessError,
  );
  assert.equal(repositoryCalled, false);
});
