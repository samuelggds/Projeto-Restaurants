// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import {
  addOrderIssueMessage,
  getOrderIssueThread,
  resolveOrderIssueThread,
} from './orderIssueChatStore.js';

const originals = {
  findFirst: prisma.orderIssueThread.findFirst,
  update: prisma.orderIssueThread.update,
  createMessage: prisma.orderIssueMessage.create,
};

afterEach(() => {
  prisma.orderIssueThread.findFirst = originals.findFirst;
  prisma.orderIssueThread.update = originals.update;
  prisma.orderIssueMessage.create = originals.createMessage;
});

test('Restaurante A não carrega o chat de um pedido real do Restaurante B', async () => {
  let captured;
  prisma.orderIssueThread.findFirst = async (args) => {
    captured = args;
    return null;
  };

  const result = await getOrderIssueThread(701, 17);

  assert.equal(result, null);
  assert.deepEqual(captured, {
    where: { orderId: 701, restaurantId: 17 },
    include: { messages: { orderBy: { sentAt: 'asc' } } },
  });
});

test('Restaurante A não adiciona mensagem ao thread pertencente ao Restaurante B', async () => {
  let createCalls = 0;
  prisma.orderIssueThread.findFirst = async ({ where, select }) => {
    assert.deepEqual(where, { orderId: 701, restaurantId: 17 });
    assert.deepEqual(select, { id: true, isResolved: true });
    return null;
  };
  prisma.orderIssueMessage.create = async () => {
    createCalls += 1;
    throw new Error('não deveria criar mensagem');
  };

  await assert.rejects(
    () =>
      addOrderIssueMessage({
        orderId: 701,
        restaurantId: 17,
        senderType: 'ADMIN',
        senderName: 'Admin A',
        message: 'Tentativa entre tenants',
      }),
    /Conversa não encontrada/i,
  );
  assert.equal(createCalls, 0);
});

test('resolução do chat repete restaurantId na leitura e na própria escrita', async () => {
  const reads = [];
  let updateArgs;
  prisma.orderIssueThread.findFirst = async (args) => {
    reads.push(args);
    if (args.select) {
      return { id: 333, isResolved: false };
    }
    return {
      id: 333,
      orderId: 701,
      restaurantId: 17,
      isResolved: true,
      messages: [],
    };
  };
  prisma.orderIssueThread.update = async (args) => {
    updateArgs = args;
    return { id: 333, ...args.data };
  };

  const result = await resolveOrderIssueThread({
    orderId: 701,
    restaurantId: 17,
    resolvedByName: 'Admin A',
  });

  assert.equal(result.restaurantId, 17);
  assert.deepEqual(reads[0].where, { orderId: 701, restaurantId: 17 });
  assert.deepEqual(reads[1].where, { orderId: 701, restaurantId: 17 });
  assert.deepEqual(updateArgs.where, { id: 333, restaurantId: 17 });
  assert.equal(updateArgs.data.resolvedByName, 'Admin A');
});
