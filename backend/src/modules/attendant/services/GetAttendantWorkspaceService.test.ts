// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { FuncionarioSubRole, UserRole } from '@prisma/client';
import {
  AttendantWorkspaceAccessError,
  GetAttendantWorkspaceService,
} from './GetAttendantWorkspaceService.js';

const actor = {
  restaurantId: 17,
  role: UserRole.FUNCIONARIO,
  subRole: FuncionarioSubRole.ATENDENTE,
};

function createService(snapshot, onLoad = () => undefined) {
  const repository = {
    async load(restaurantId, resolvedSince) {
      onLoad({ restaurantId, resolvedSince });
      return snapshot;
    },
  };
  const tenantRunner = async (restaurantId, callback) => {
    assert.equal(restaurantId, actor.restaurantId);
    return callback({ tenant: restaurantId });
  };
  return new GetAttendantWorkspaceService(repository, tenantRunner);
}

test('monta um snapshot operacional com ids de ação sem repassar dados sensíveis', async () => {
  const now = new Date('2026-09-02T15:30:00.000Z');
  const service = createService({
    orders: [
      {
        id: 81,
        publicId: 'order-public-id',
        type: 'RETIRADA',
        status: 'PRONTO',
        createdAt: new Date('2026-09-02T15:00:00.000Z'),
        readyAt: new Date('2026-09-02T15:25:00.000Z'),
        table: null,
        participant: null,
        user: { name: '  Cliente balcão  ', phone: '11999999999' },
        total: 99.9,
        address: 'dado que não pode sair',
        items: [
          {
            quantity: 2,
            product: { name: 'Pizza da casa' },
            price: 49.95,
            observation: 'segredo',
          },
        ],
      },
    ],
    calls: [
      {
        id: 9,
        table: { number: 4 },
        type: 'BILL',
        status: 'WAITING',
        assignedToId: null,
        assignedTo: null,
        requestedAt: new Date('2026-09-02T15:20:00.000Z'),
        assignedAt: null,
        resolvedAt: null,
      },
    ],
    sessions: [
      {
        table: { number: 4 },
        status: 'CLOSING_REQUESTED',
        openedAt: new Date('2026-09-02T14:00:00.000Z'),
        pinHash: 'não expor',
        _count: { participants: 3, orders: 2, serviceCalls: 1 },
      },
    ],
  });

  const result = await service.execute(actor, now);

  assert.deepEqual(result, {
    generatedAt: now.toISOString(),
    orders: [
      {
        id: 'order-public-id',
        orderId: 81,
        code: '#81',
        type: 'RETIRADA',
        status: 'PRONTO',
        tableNumber: null,
        customerName: 'Cliente balcão',
        createdAt: '2026-09-02T15:00:00.000Z',
        readyAt: '2026-09-02T15:25:00.000Z',
        items: [{ quantity: 2, productName: 'Pizza da casa' }],
      },
    ],
    calls: [
      {
        id: '9',
        tableNumber: 4,
        type: 'BILL',
        status: 'WAITING',
        assignedToId: null,
        assignedToName: null,
        requestedAt: '2026-09-02T15:20:00.000Z',
        assignedAt: null,
        resolvedAt: null,
      },
    ],
    tables: [
      {
        id: '4',
        tableNumber: 4,
        status: 'CLOSING_REQUESTED',
        openedAt: '2026-09-02T14:00:00.000Z',
        participantCount: 3,
        activeOrderCount: 2,
        activeCallCount: 1,
      },
    ],
  });
  assert.equal(JSON.stringify(result).includes('11999999999'), false);
  assert.equal(JSON.stringify(result).includes('dado que não pode sair'), false);
  assert.equal(JSON.stringify(result).includes('segredo'), false);
  assert.equal(JSON.stringify(result).includes('não expor'), false);
});

test('abre o contexto no tenant e usa o início do dia para o histórico de chamados', async () => {
  let loadInput;
  const now = new Date('2026-09-02T15:30:00.000Z');
  const service = createService({ orders: [], calls: [], sessions: [] }, (input) => {
    loadInput = input;
  });

  await service.execute(actor, now);

  assert.equal(loadInput.restaurantId, actor.restaurantId);
  assert.equal(loadInput.resolvedSince.getHours(), 0);
  assert.equal(loadInput.resolvedSince.getMinutes(), 0);
});

test('nega qualquer ator que não seja funcionário ATENDENTE do restaurante', async () => {
  const service = createService({ orders: [], calls: [], sessions: [] });
  const denied = [
    { ...actor, role: UserRole.ADMIN },
    { ...actor, role: UserRole.SUPER_ADMIN },
    { ...actor, subRole: FuncionarioSubRole.COZINHA },
    { ...actor, subRole: FuncionarioSubRole.GARCOM },
    { ...actor, restaurantId: null },
  ];

  for (const deniedActor of denied) {
    await assert.rejects(
      () => service.execute(deniedActor),
      (error) => error instanceof AttendantWorkspaceAccessError,
    );
  }
});
