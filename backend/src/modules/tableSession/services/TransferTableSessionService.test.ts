import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { tableSessionEvents } from '../realtime/tableSessionEvents.js';
import { TransferTableSessionService } from './TransferTableSessionService.js';

const originalTransaction = prisma.$transaction;
const originalEvent = tableSessionEvents.transferred;

afterEach(() => {
  Reflect.set(prisma, '$transaction', originalTransaction);
  tableSessionEvents.transferred = originalEvent;
});

type Scenario = {
  missingSession?: boolean;
  destinationOwned?: boolean;
  destinationActive?: boolean;
  occupied?: boolean;
  reserved?: boolean;
  staleUpdate?: boolean;
};

function setup(input: Scenario = {}) {
  const calls: Array<{ table: string; args: unknown }> = [];
  const locked = [
    { id: 91, number: 1, active: true },
    ...(input.destinationOwned === false ? [] :
      [{ id: 92, number: 2, active: input.destinationActive !== false }]),
  ];
  const expiresAt = new Date(Date.now() + 60 * 60_000);
  const tx = {
    $queryRaw: async (sql: unknown) =>
      JSON.stringify(sql).includes('FOR UPDATE') ? locked : [],
    tableSession: {
      findFirst: async (args: { where: { id?: number; tableId?: number } }) =>
        args.where.id
          ? input.missingSession ? null :
            { id: 55, tableId: 91, publicId: 'public-session-55', expiresAt }
          : input.occupied ? { id: 68 } : null,
      updateMany: async (args: unknown) => {
        calls.push({ table: 'session', args });
        return { count: input.staleUpdate ? 0 : 1 };
      },
    },
    tableReservation: { findFirst: async () => input.reserved ? { id: 17 } : null },
    order: { updateMany: async (args: unknown) => {
      calls.push({ table: 'order', args }); return { count: 2 };
    } },
    tableServiceCall: { updateMany: async (args: unknown) => {
      calls.push({ table: 'call', args }); return { count: 1 };
    } },
    tableAccessRequest: { updateMany: async (args: unknown) => {
      calls.push({ table: 'access', args }); return { count: 1 };
    } },
    tableSessionTransfer: { create: async (args: unknown) => {
      calls.push({ table: 'audit', args }); return { id: 1 };
    } },
  };
  Reflect.set(prisma, '$transaction', async (
    callback: (db: typeof tx) => Promise<unknown>,
    options: { isolationLevel?: string },
  ) => {
    assert.equal(options.isolationLevel, Prisma.TransactionIsolationLevel.Serializable);
    return callback(tx);
  });
  let emitted: unknown = null;
  tableSessionEvents.transferred = async (payload) => {
    emitted = payload;
  };
  const execute = () => new TransferTableSessionService().execute({
    restaurantId: 7, sessionId: 55, destinationTableId: 92, actorId: 3,
  });
  return { execute, calls, getEmitted: () => emitted };
}

test('transfere uma sessão existente de forma atômica, preservando vínculo financeiro e participantes', async () => {
  const { execute, calls, getEmitted } = setup();
  const result = await execute();
  assert.equal(result.restaurantId, 7);
  assert.equal(result.sessionId, 55);
  assert.equal(result.fromTableId, 91);
  assert.equal(result.tableId, 92);
  assert.equal('destinationTableToken' in result, false);
  assert.equal('sessionToken' in result, false);
  assert.deepEqual(calls.map((c) => c.table), ['session', 'order', 'call', 'access', 'audit']);

  for (const entry of calls.filter((c) => c.table !== 'audit')) {
    const args = entry.args as {
      where: { restaurantId: number; tableSessionId?: number; tableId: number };
      data: { tableId: number };
    };
    assert.equal(args.where.restaurantId, 7);
    assert.equal(args.where.tableId, 91);
    assert.equal(args.data.tableId, 92);
    if (entry.table !== 'session') assert.equal(args.where.tableSessionId, 55);
  }
  const audit = calls.find((c) => c.table === 'audit')?.args as {
    data: { restaurantId: number; tableSessionId: number; transferredById: number };
  };
  assert.equal(audit.data.restaurantId, 7);
  assert.equal(audit.data.tableSessionId, 55);
  assert.equal(audit.data.transferredById, 3);
  assert.equal((getEmitted() as { restaurantId: number }).restaurantId, 7);
  assert.equal('destinationTableToken' in (getEmitted() as object), false);
  assert.equal(calls.some((c) => ['payment', 'participant', 'billItem'].includes(c.table)), false);
});

test('bloqueia destino fora do tenant antes de modificar qualquer registro', async () => {
  const { execute, calls } = setup({ destinationOwned: false });
  await assert.rejects(execute, /destino inexistente|outro restaurante/i);
  assert.deepEqual(calls, []);
});

test('bloqueia destino inativo, ocupado ou com reserva confirmada', async () => {
  for (const scenario of [
    { destinationActive: false },
    { occupied: true },
    { reserved: true },
  ]) {
    const { execute, calls } = setup(scenario);
    await assert.rejects(execute);
    assert.equal(calls.length, 0);
  }
});

test('não migra pedidos ou contas se a sessão mudou durante a operação', async () => {
  const { execute, calls } = setup({ staleUpdate: true });
  await assert.rejects(execute, /sessão foi alterada/i);
  assert.deepEqual(calls.map((c) => c.table), ['session']);
});

test('identificadores inválidos são rejeitados sem executar transação', async () => {
  const { calls } = setup();
  await assert.rejects(
    () => new TransferTableSessionService().execute({
      restaurantId: 7, sessionId: 55, destinationTableId: -92, actorId: 3,
    }),
    /identificador inválido/i,
  );
  assert.deepEqual(calls, []);
});
