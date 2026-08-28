// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { SendSuperAdminSupportMessageService } from './SendSuperAdminSupportMessageService.js';

const context = {
  actorUserId: 1,
  ipAddress: '127.0.0.1',
  requestId: 'support-test',
  userAgent: 'node:test',
};

test('responde, encerra e audita uma conversa da plataforma no mesmo tenant', async () => {
  let savedInput;
  let auditInput;
  const transaction = {};
  const repository = {
    transaction: async (operation) => operation(transaction),
    findActor: async (id, db) => {
      assert.equal(id, 1);
      assert.equal(db, transaction);
      return { id: 1, name: 'Super Admin', role: 'SUPER_ADMIN' };
    },
    findRestaurantForMutation: async (id, db) => {
      assert.equal(id, 9);
      assert.equal(db, transaction);
      return { id: 9, name: 'Restaurante Nove' };
    },
    createSupportMessage: async (input, db) => {
      assert.equal(db, transaction);
      savedInput = input;
      return {
        id: 31,
        ...input,
        senderRole: 'SUPER_ADMIN',
        sentAt: new Date('2026-08-28T15:00:00.000Z'),
      };
    },
    createAuditLog: async (input, db) => {
      assert.equal(db, transaction);
      auditInput = input;
      return { id: 50 };
    },
  };

  const result = await new SendSuperAdminSupportMessageService(repository).execute(
    9,
    {
      message: 'Credenciais revisadas; integração funcionando.',
      closeConversation: true,
    },
    context,
  );

  assert.deepEqual(savedInput, {
    restaurantId: 9,
    senderUserId: 1,
    senderLabel: 'Super Admin',
    message: 'Credenciais revisadas; integração funcionando.',
    issueStatus: 'CLOSED',
  });
  assert.equal(auditInput.action, 'SEND_SUPPORT_MESSAGE');
  assert.equal(auditInput.restaurantId, 9);
  assert.equal(auditInput.metadata.after.conversationClosed, true);
  assert.equal(result.issueStatus, 'CLOSED');
});

test('resposta comum mantém a conversa aberta para o restaurante', async () => {
  let savedInput;
  const transaction = {};
  const repository = {
    transaction: async (operation) => operation(transaction),
    findActor: async () => ({ id: 1, name: 'Super Admin', role: 'SUPER_ADMIN' }),
    findRestaurantForMutation: async () => ({ id: 9, name: 'Restaurante Nove' }),
    createSupportMessage: async (input) => {
      savedInput = input;
      return {
        id: 32,
        ...input,
        senderRole: 'SUPER_ADMIN',
        sentAt: new Date('2026-08-28T15:05:00.000Z'),
      };
    },
    createAuditLog: async () => ({ id: 51 }),
  };

  await new SendSuperAdminSupportMessageService(repository).execute(
    9,
    { message: 'Pode testar novamente, por favor?' },
    context,
  );

  assert.equal(savedInput.issueStatus, null);
});
