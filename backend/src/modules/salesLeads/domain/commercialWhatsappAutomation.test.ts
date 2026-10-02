// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMMERCIAL_WHATSAPP_AUTO_REPLY_DELAY_MS,
  COMMERCIAL_WHATSAPP_CLOSED_COOLDOWN_MS,
  commercialWhatsappAutoReplyAvailableAt,
  commercialWhatsappAutoReplySuppressionReason,
  shouldReopenCommercialWhatsappCycle,
} from './commercialWhatsappAutomation.js';

test('agenda respostas automáticas com atraso de cinco segundos', () => {
  const now = new Date('2026-10-01T12:00:00.000Z');
  const availableAt = commercialWhatsappAutoReplyAvailableAt(now);

  assert.equal(COMMERCIAL_WHATSAPP_AUTO_REPLY_DELAY_MS, 5_000);
  assert.equal(availableAt.getTime() - now.getTime(), 5_000);
});

test('mantém o bot silencioso fora do horário e durante atendimento humano', () => {
  assert.equal(
    commercialWhatsappAutoReplySuppressionReason({
      kind: 'GREETING',
      mode: 'BOT',
      automationEnabled: true,
      open: false,
    }),
    'outside_hours',
  );
  assert.equal(
    commercialWhatsappAutoReplySuppressionReason({
      kind: 'GREETING',
      mode: 'HUMAN',
      automationEnabled: true,
      open: true,
    }),
    'human_mode',
  );
  assert.equal(
    commercialWhatsappAutoReplySuppressionReason({
      kind: 'HANDOFF',
      mode: 'CLOSED',
      automationEnabled: true,
      open: true,
    }),
    'conversation_closed',
  );
});

test('saudação automática de lead também respeita horário e estado da conversa', () => {
  assert.equal(
    commercialWhatsappAutoReplySuppressionReason({
      kind: 'FORM_GREETING',
      mode: 'BOT',
      automationEnabled: true,
      open: false,
    }),
    'outside_hours',
  );
  assert.equal(
    commercialWhatsappAutoReplySuppressionReason({
      kind: 'FORM_GREETING',
      mode: 'BOT',
      automationEnabled: true,
      open: true,
    }),
    null,
  );
});

test('resposta manual nunca é bloqueada pela política automática', () => {
  assert.equal(
    commercialWhatsappAutoReplySuppressionReason({
      kind: 'MANUAL',
      mode: 'CLOSED',
      automationEnabled: false,
      open: false,
    }),
    null,
  );
});

test('elimina mensagens AWAY do fluxo antigo', () => {
  assert.equal(
    commercialWhatsappAutoReplySuppressionReason({
      kind: 'AWAY',
      mode: 'BOT',
      automationEnabled: true,
      open: true,
    }),
    'outside_hours',
  );
});

test('novo ciclo automático só abre após 30 minutos e dentro do horário', () => {
  const closedAt = new Date('2026-10-01T12:00:00.000Z');

  assert.equal(COMMERCIAL_WHATSAPP_CLOSED_COOLDOWN_MS, 30 * 60 * 1_000);
  assert.equal(
    shouldReopenCommercialWhatsappCycle({
      mode: 'CLOSED',
      closedAt,
      open: true,
      now: new Date('2026-10-01T12:29:59.999Z'),
    }),
    false,
  );
  assert.equal(
    shouldReopenCommercialWhatsappCycle({
      mode: 'CLOSED',
      closedAt,
      open: false,
      now: new Date('2026-10-01T13:00:00.000Z'),
    }),
    false,
  );
  assert.equal(
    shouldReopenCommercialWhatsappCycle({
      mode: 'CLOSED',
      closedAt,
      open: true,
      now: new Date('2026-10-01T12:30:00.000Z'),
    }),
    true,
  );
});
