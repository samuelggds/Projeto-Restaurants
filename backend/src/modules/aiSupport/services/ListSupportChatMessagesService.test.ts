// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { ListSupportChatMessagesService } from './ListSupportChatMessagesService.js';

function input(overrides = {}) {
  return {
    requesterRole: 'ADMIN',
    requesterRestaurantId: 3,
    queryRestaurantId: null,
    queryBeforeId: null,
    queryLimit: null,
    queryChannel: null,
    ...overrides,
  };
}

function row(overrides = {}) {
  return {
    id: 10,
    message: 'Preciso de ajuda com a cobrança.',
    senderRole: 'ADMIN',
    senderUserId: 7,
    senderLabel: 'Admin',
    issueStatus: null,
    issueResponse: null,
    issueRespondedAt: null,
    issueClosedAt: null,
    restaurantId: 3,
    sentAt: new Date('2026-08-28T12:00:00.000Z'),
    ...overrides,
  };
}

test('SUPER_ADMIN consulta somente o canal PLATFORM do restaurante selecionado', async () => {
  let query;
  const repository = {
    listForRestaurant: async (args) => {
      query = args;
      return [row({ restaurantId: 12 })];
    },
  };

  const result = await new ListSupportChatMessagesService(repository).execute(
    input({
      requesterRole: 'SUPER_ADMIN',
      requesterRestaurantId: null,
      queryRestaurantId: 12,
      queryChannel: 'INTERNAL',
    }),
  );

  assert.deepEqual(query, {
    restaurantId: 12,
    beforeId: 0,
    limit: 41,
    channel: 'PLATFORM',
  });
  assert.equal(result.messages[0].senderRole, 'ADMIN');
});

test('ADMIN separa relatos INTERNAL e nunca troca o tenant pela query', async () => {
  let query;
  const repository = {
    listForRestaurant: async (args) => {
      query = args;
      return [
        row({ id: 12, senderRole: 'FUNCIONARIO', issueStatus: 'OPEN' }),
        row({ id: 11, senderRole: 'MOTOQUEIRO', issueStatus: 'CLOSED' }),
      ];
    },
  };

  const result = await new ListSupportChatMessagesService(repository).execute(
    input({ queryRestaurantId: 999, queryLimit: 2, queryChannel: 'internal' }),
  );

  assert.deepEqual(query, {
    restaurantId: 3,
    beforeId: 0,
    limit: 3,
    channel: 'INTERNAL',
  });
  assert.deepEqual(
    result.messages.map((message) => message.id),
    ['11', '12'],
  );
});

test('rejeita papéis e canais sem contrato de suporte', async () => {
  const repository = { listForRestaurant: async () => [] };
  const service = new ListSupportChatMessagesService(repository);

  await assert.rejects(
    () => service.execute(input({ requesterRole: 'FUNCIONARIO' })),
    /permissão/i,
  );
  await assert.rejects(() => service.execute(input({ queryChannel: 'PUBLIC' })), /canal/i);
});
