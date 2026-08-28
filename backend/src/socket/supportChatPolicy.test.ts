import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canSendSupportChat,
  getSupportChatRecipientRooms,
  getSupportMessageSender,
  isOperationalSupportReporter,
} from './supportChatPolicy.js';

test('permite relatos de funções operacionais e identifica o remetente', () => {
  assert.equal(canSendSupportChat('FUNCIONARIO'), true);
  assert.equal(canSendSupportChat('MOTOQUEIRO'), true);
  assert.equal(isOperationalSupportReporter('FUNCIONARIO'), true);
  assert.deepEqual(getSupportMessageSender('MOTOQUEIRO'), {
    senderRole: 'MOTOQUEIRO',
    senderLabel: 'Motoqueiro',
  });
});

test('mantém o chat restrito aos perfis permitidos', () => {
  assert.equal(canSendSupportChat('CLIENTE'), false);
  assert.equal(isOperationalSupportReporter('ADMIN'), false);
  assert.deepEqual(getSupportMessageSender('ADMIN'), {
    senderRole: 'ADMIN',
    senderLabel: 'Admin',
  });
});

test('separa relatos internos da fila exclusiva do SUPER_ADMIN', () => {
  assert.deepEqual(getSupportChatRecipientRooms('FUNCIONARIO', 7), ['restaurant:7:admin']);
  assert.deepEqual(getSupportChatRecipientRooms('MOTOQUEIRO', 7), ['restaurant:7:admin']);
  assert.deepEqual(getSupportChatRecipientRooms('ADMIN', 7), ['super_admin']);
  assert.deepEqual(getSupportChatRecipientRooms('SUPER_ADMIN', 7), [
    'restaurant:7:admin',
    'super_admin',
  ]);
});
