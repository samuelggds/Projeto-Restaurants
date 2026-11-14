// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMMERCIAL_WHATSAPP_AUTO_REPLY_DELAY_MS,
  COMMERCIAL_WHATSAPP_HUMAN_HANDOFF_TIMEOUT_MS,
  COMMERCIAL_WHATSAPP_CLOSED_COOLDOWN_MS,
  commercialWhatsappAutoReplyAvailableAt,
  commercialWhatsappAutoReplyRetryAt,
  commercialWhatsappAutoReplySuppressionReason,
  shouldReopenCommercialWhatsappCycle,
} from './commercialWhatsappAutomation.js';

test('agenda respostas automáticas com atraso de quinze segundos', () => {
  const now = new Date('2026-10-01T12:00:00.000Z');
  const availableAt = commercialWhatsappAutoReplyAvailableAt(now);

  assert.equal(COMMERCIAL_WHATSAPP_AUTO_REPLY_DELAY_MS, 15_000);
  assert.equal(availableAt.getTime() - now.getTime(), 15_000);
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

test('saudação de lead funciona 24h com IA habilitada, mas respeita consentimento operacional e modo humano', () => {
  const base = { kind: 'FORM_GREETING', mode: 'BOT', automationEnabled: true };
  assert.equal(
    commercialWhatsappAutoReplySuppressionReason({ ...base, open: false, aiEnabled: false }),
    'outside_hours',
  );
  assert.equal(
    commercialWhatsappAutoReplySuppressionReason({ ...base, open: false, aiEnabled: true }),
    null,
  );
  assert.equal(
    commercialWhatsappAutoReplySuppressionReason({ ...base, open: true, aiEnabled: false }),
    null,
  );
  assert.equal(
    commercialWhatsappAutoReplySuppressionReason({ ...base, mode: 'HUMAN', open: false, aiEnabled: true }),
    'human_mode',
  );
  assert.equal(
    commercialWhatsappAutoReplySuppressionReason({ ...base, mode: 'CLOSED', open: false, aiEnabled: true }),
    'conversation_closed',
  );
  assert.equal(
    commercialWhatsappAutoReplySuppressionReason({ ...base, automationEnabled: false, open: false, aiEnabled: true }),
    'automation_disabled',
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

test('reserva concorrente adia próxima resposta para após os 15 segundos, sem aguardar novamente caso já vencida', () => {
  const now = new Date('2026-10-23T12:00:00.000Z');
  const reservedUntil = new Date('2026-10-23T12:00:15.000Z');
  assert.equal(commercialWhatsappAutoReplyRetryAt(now, reservedUntil).toISOString(), '2026-10-23T12:00:15.100Z');
  assert.equal(
    commercialWhatsappAutoReplyRetryAt(now, new Date('2026-10-23T11:59:59.000Z')).toISOString(),
    '2026-10-23T12:00:15.000Z',
  );
});

test('IA responde 24h em BOT, mas nunca depois de takeover humano ou encerramento', () => {
  for (const open of [false, true]) {
    assert.equal(commercialWhatsappAutoReplySuppressionReason({
      kind: 'AI_REPLY', mode: 'BOT', automationEnabled: true, open, aiEnabled: true,
    }), null);
    assert.equal(commercialWhatsappAutoReplySuppressionReason({
      kind: 'AI_REPLY', mode: 'HUMAN', automationEnabled: true, open, aiEnabled: true,
    }), 'human_mode');
    assert.equal(commercialWhatsappAutoReplySuppressionReason({
      kind: 'AI_REPLY', mode: 'CLOSED', automationEnabled: true, open, aiEnabled: true,
    }), 'conversation_closed');
  }
  assert.equal(commercialWhatsappAutoReplySuppressionReason({
    kind: 'AI_REPLY', mode: 'BOT', automationEnabled: false, open: true, aiEnabled: true,
  }), 'automation_disabled');
  assert.equal(commercialWhatsappAutoReplySuppressionReason({
    kind: 'AI_REPLY', mode: 'BOT', automationEnabled: true, open: true, aiEnabled: false,
  }), 'ai_disabled');
});

test('retomada de solicitação humana tem prazo fixo de dez minutos', () => {
  assert.equal(COMMERCIAL_WHATSAPP_HUMAN_HANDOFF_TIMEOUT_MS, 10 * 60_000);
  assert.equal(commercialWhatsappAutoReplySuppressionReason({
    kind: 'AI_TIMEOUT', mode: 'BOT', automationEnabled: true, open: false, aiEnabled: true,
  }), null);
  assert.equal(commercialWhatsappAutoReplySuppressionReason({
    kind: 'AI_TIMEOUT', mode: 'HUMAN', automationEnabled: true, open: true, aiEnabled: true,
  }), 'human_mode');
});
