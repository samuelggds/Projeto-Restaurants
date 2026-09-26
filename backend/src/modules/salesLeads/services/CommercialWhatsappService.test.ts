import assert from 'node:assert/strict';
import test from 'node:test';
import { inboundMeta, inboundText } from './CommercialWhatsappService.js';

test('webhook comercial aceita qualquer mensagem de texto do cliente', () => {
  const payload = {
    event: 'messages.upsert',
    data: {
      key: {
        remoteJid: '5585989323113@s.whatsapp.net',
        fromMe: false,
        id: 'msg-any-text-1',
      },
      message: {
        conversation: 'Quero saber como funciona o plano Premium e os pagamentos.',
      },
    },
  };

  assert.equal(
    inboundText(payload),
    'Quero saber como funciona o plano Premium e os pagamentos.',
  );

  const meta = inboundMeta(payload);
  assert.equal(meta.event, 'messages.upsert');
  assert.equal(meta.remoteJid, '5585989323113@s.whatsapp.net');
  assert.equal(meta.fromMe, false);
  assert.equal(meta.providerMessageId, 'msg-any-text-1');
  assert.equal(meta.event.includes('messages'), true);
});

test('webhook comercial aceita texto estendido sem depender de palavra-chave', () => {
  const payload = {
    type: 'MESSAGES_UPSERT',
    data: {
      key: {
        remoteJid: '5585989323113@s.whatsapp.net',
        fromMe: false,
        id: 'msg-any-text-2',
      },
      message: {
        extendedTextMessage: {
          text: 'Pode me explicar melhor como funciona a GastroNexa?',
        },
      },
    },
  };

  assert.equal(
    inboundText(payload),
    'Pode me explicar melhor como funciona a GastroNexa?',
  );
  assert.equal(inboundMeta(payload).event.includes('messages'), true);
});
