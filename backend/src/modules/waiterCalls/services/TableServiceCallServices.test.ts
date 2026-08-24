// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import {
  PlanType,
  SubscriptionStatus,
  TableServiceCallStatus,
  TableServiceCallType,
  UserRole,
} from '@prisma/client';
import tableServiceCallRepository from '../repositories/TableServiceCallRepository.js';
import { tableServiceCallEvents } from '../realtime/tableServiceCallEvents.js';
import createTableServiceCallService from './CreateTableServiceCallService.js';
import listTableServiceCallsService from './ListTableServiceCallsService.js';
import updateTableServiceCallStatusService from './UpdateTableServiceCallStatusService.js';

const originals = {
  findContext: tableServiceCallRepository.findOpenSessionContext,
  findActive: tableServiceCallRepository.findActiveByTableAndType,
  create: tableServiceCallRepository.create,
  list: tableServiceCallRepository.listByRestaurant,
  findById: tableServiceCallRepository.findByIdForRestaurant,
  assign: tableServiceCallRepository.assignIfWaiting,
  resolve: tableServiceCallRepository.resolveIfInProgress,
  createdEvent: tableServiceCallEvents.created,
  updatedEvent: tableServiceCallEvents.updated,
};

afterEach(() => {
  tableServiceCallRepository.findOpenSessionContext = originals.findContext;
  tableServiceCallRepository.findActiveByTableAndType = originals.findActive;
  tableServiceCallRepository.create = originals.create;
  tableServiceCallRepository.listByRestaurant = originals.list;
  tableServiceCallRepository.findByIdForRestaurant = originals.findById;
  tableServiceCallRepository.assignIfWaiting = originals.assign;
  tableServiceCallRepository.resolveIfInProgress = originals.resolve;
  tableServiceCallEvents.created = originals.createdEvent;
  tableServiceCallEvents.updated = originals.updatedEvent;
});

const activeContext = {
  id: 55,
  tableId: 91,
  table: {
    id: 91,
    number: 12,
    restaurantId: 7,
    restaurant: {
      settings: {
        tableOrderingEnabled: true,
        waiterCallEnabled: true,
        billRequestEnabled: true,
      },
      subscription: {
        plan: PlanType.PREMIUM,
        status: SubscriptionStatus.ATIVA,
      },
    },
  },
};

const waitingCall = {
  id: 301,
  restaurantId: 7,
  tableId: 91,
  tableSessionId: 55,
  type: TableServiceCallType.WAITER,
  status: TableServiceCallStatus.WAITING,
  assignedToId: null,
  table: { id: 91, number: 12, active: true },
  assignedTo: null,
  resolvedBy: null,
};

test('cria chamado usando exclusivamente o contexto tenant da sessão aberta', async () => {
  let contextArguments;
  tableServiceCallRepository.findOpenSessionContext = async (...args) => {
    contextArguments = args;
    return activeContext;
  };
  let activeArguments;
  tableServiceCallRepository.findActiveByTableAndType = async (...args) => {
    activeArguments = args;
    return null;
  };
  let createData;
  tableServiceCallRepository.create = async (data) => {
    createData = data;
    return waitingCall;
  };
  let emitted;
  tableServiceCallEvents.created = async (payload) => {
    emitted = payload;
  };

  const result = await createTableServiceCallService.execute({
    sessionId: 55,
    tableId: 91,
    restaurantId: 7,
    type: 'WAITER',
  });

  assert.deepEqual(contextArguments.slice(0, 3), [55, 91, 7]);
  assert.deepEqual(activeArguments.slice(0, 3), [7, 91, TableServiceCallType.WAITER]);
  assert.deepEqual(createData, {
    restaurantId: 7,
    tableId: 91,
    tableSessionId: 55,
    type: TableServiceCallType.WAITER,
  });
  assert.equal(result.duplicate, false);
  assert.equal(result.call.id, 301);
  assert.equal(emitted.id, 301);
});

test('não cria chamado para sessão expirada, fechada ou pertencente a outro restaurante', async () => {
  tableServiceCallRepository.findOpenSessionContext = async () => null;
  let createCalled = false;
  tableServiceCallRepository.create = async () => {
    createCalled = true;
  };

  await assert.rejects(
    () =>
      createTableServiceCallService.execute({
        sessionId: 55,
        tableId: 91,
        restaurantId: 8,
        type: 'WAITER',
      }),
    /sessão.*não está mais ativa/i,
  );
  assert.equal(createCalled, false);
});

test('respeita flags WAITER/BILL e mantém cliques repetidos idempotentes', async () => {
  tableServiceCallRepository.findOpenSessionContext = async () => ({
    ...activeContext,
    table: {
      ...activeContext.table,
      restaurant: {
        ...activeContext.table.restaurant,
        settings: {
          ...activeContext.table.restaurant.settings,
          waiterCallEnabled: false,
        },
      },
    },
  });

  await assert.rejects(
    () =>
      createTableServiceCallService.execute({
        sessionId: 55,
        tableId: 91,
        restaurantId: 7,
        type: 'WAITER',
      }),
    /chamados ao garçom estão desativados/i,
  );

  tableServiceCallRepository.findOpenSessionContext = async () => activeContext;
  tableServiceCallRepository.findActiveByTableAndType = async (
    restaurantId,
    tableId,
    type,
  ) => {
    assert.deepEqual([restaurantId, tableId, type], [7, 91, TableServiceCallType.BILL]);
    return { ...waitingCall, type: TableServiceCallType.BILL };
  };
  let createCalled = false;
  tableServiceCallRepository.create = async () => {
    createCalled = true;
  };

  const result = await createTableServiceCallService.execute({
    sessionId: 55,
    tableId: 91,
    restaurantId: 7,
    type: 'BILL',
  });
  assert.equal(result.duplicate, true);
  assert.equal(createCalled, false);
});

test('lista somente no restaurantId autenticado e valida filtros', async () => {
  let listArguments;
  tableServiceCallRepository.listByRestaurant = async (...args) => {
    listArguments = args;
    return [waitingCall];
  };

  const result = await listTableServiceCallsService.execute({
    restaurantId: 7,
    status: 'waiting',
    type: 'bill',
    tableNumber: '12',
  });

  assert.equal(listArguments[0], 7);
  assert.equal(listArguments[1].status, TableServiceCallStatus.WAITING);
  assert.equal(listArguments[1].type, TableServiceCallType.BILL);
  assert.equal(listArguments[1].tableNumber, 12);
  assert.equal(listArguments[1].take, 200);
  assert.equal(result.length, 1);

  await assert.rejects(
    () => listTableServiceCallsService.execute({ restaurantId: 7, type: 'ACCESS_CODE' }),
    /tipo de chamado inválido/i,
  );
  await assert.rejects(
    () => listTableServiceCallsService.execute({ restaurantId: 7, status: 'UNKNOWN' }),
    /status de chamado inválido/i,
  );
});

test('aplica WAITING → IN_PROGRESS → RESOLVED e protege responsável/tenant', async () => {
  let current = waitingCall;
  tableServiceCallRepository.findByIdForRestaurant = async (id, restaurantId) => {
    assert.equal(id, 301);
    assert.equal(restaurantId, 7);
    return current;
  };
  tableServiceCallRepository.assignIfWaiting = async (id, restaurantId, actorId) => {
    assert.deepEqual([id, restaurantId, actorId], [301, 7, 44]);
    current = {
      ...waitingCall,
      status: TableServiceCallStatus.IN_PROGRESS,
      assignedToId: 44,
      assignedTo: { id: 44, name: 'Ana' },
    };
    return 1;
  };
  tableServiceCallRepository.resolveIfInProgress = async (id, restaurantId, actorId) => {
    assert.deepEqual([id, restaurantId, actorId], [301, 7, 44]);
    current = {
      ...current,
      status: TableServiceCallStatus.RESOLVED,
      resolvedById: 44,
      resolvedBy: { id: 44, name: 'Ana' },
    };
    return 1;
  };
  const emittedStatuses = [];
  tableServiceCallEvents.updated = async (payload) => {
    emittedStatuses.push(payload.status);
  };

  const assigned = await updateTableServiceCallStatusService.execute({
    id: 301,
    restaurantId: 7,
    actorUserId: 44,
    actorRole: UserRole.FUNCIONARIO,
    status: 'IN_PROGRESS',
  });
  assert.equal(assigned.assignedToId, 44);

  const resolved = await updateTableServiceCallStatusService.execute({
    id: 301,
    restaurantId: 7,
    actorUserId: 44,
    actorRole: UserRole.FUNCIONARIO,
    status: 'RESOLVED',
  });
  assert.equal(resolved.status, TableServiceCallStatus.RESOLVED);
  assert.deepEqual(emittedStatuses, [
    TableServiceCallStatus.IN_PROGRESS,
    TableServiceCallStatus.RESOLVED,
  ]);
});

test('somente o garçom responsável ou um admin pode concluir', async () => {
  const inProgress = {
    ...waitingCall,
    status: TableServiceCallStatus.IN_PROGRESS,
    assignedToId: 44,
  };
  tableServiceCallRepository.findByIdForRestaurant = async (_id, restaurantId) =>
    restaurantId === 7 ? inProgress : null;
  let resolvedBy;
  tableServiceCallRepository.resolveIfInProgress = async (_id, _restaurantId, actorId) => {
    resolvedBy = actorId;
    return 1;
  };
  tableServiceCallEvents.updated = async () => {};

  await assert.rejects(
    () =>
      updateTableServiceCallStatusService.execute({
        id: 301,
        restaurantId: 7,
        actorUserId: 45,
        actorRole: UserRole.FUNCIONARIO,
        status: 'RESOLVED',
      }),
    /somente o garçom que assumiu/i,
  );

  tableServiceCallRepository.findByIdForRestaurant = async (_id, restaurantId) => {
    if (restaurantId !== 7) return null;
    return resolvedBy
      ? { ...inProgress, status: TableServiceCallStatus.RESOLVED, resolvedById: resolvedBy }
      : inProgress;
  };
  const adminResult = await updateTableServiceCallStatusService.execute({
    id: 301,
    restaurantId: 7,
    actorUserId: 9,
    actorRole: UserRole.ADMIN,
    status: 'RESOLVED',
  });
  assert.equal(resolvedBy, 9);
  assert.equal(adminResult.status, TableServiceCallStatus.RESOLVED);

  await assert.rejects(
    () =>
      updateTableServiceCallStatusService.execute({
        id: 301,
        restaurantId: 8,
        actorUserId: 9,
        actorRole: UserRole.ADMIN,
        status: 'RESOLVED',
      }),
    /não encontrado neste restaurante/i,
  );
});
