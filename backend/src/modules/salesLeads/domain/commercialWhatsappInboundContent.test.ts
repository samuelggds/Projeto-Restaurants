import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCommercialWhatsappInboundContent } from './commercialWhatsappInboundContent.js';

const incoming = (message: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  event: 'messages.upsert',
  data: { message, ...extra },
});

test('mensagem escrita de contato de anúncio mantém somente texto digitado pelo cliente', () => {
  const parsed = parseCommercialWhatsappInboundContent(incoming({
    extendedTextMessage: {
      text: 'Quanto custa o plano Entrada?',
      contextInfo: { externalAdReply: { title: 'Anúncio de terceiro', sourceUrl: 'https://ads.test/?token=secret' } },
    },
  }));
  assert.deepEqual(parsed, {
    text: 'Quanto custa o plano Entrada?', kind: 'TEXT', needsFixedReply: false,
  });
});

test('referência do anúncio sem pergunta gera saudação segura sem divulgar URL', () => {
  const parsed = parseCommercialWhatsappInboundContent(incoming({
    imageMessage: {
      mimetype: 'image/jpeg',
      contextInfo: { externalAdReply: { title: 'Promoção', sourceUrl: 'https://example.org/?utm=private' } },
    },
  }));
  assert.equal(parsed.kind, 'AD_REFERRAL');
  assert.match(parsed.text, /anúncio/u);
  assert.doesNotMatch(parsed.text, /example.org|utm|Promoção/u);
});

test('link de tráfego pago GastroNexa sozinho vira saudação', () => {
  const parsed = parseCommercialWhatsappInboundContent(incoming({
    conversation: 'https://www.gastronexa.com.br/?utm_source=paid',
  }));
  assert.equal(parsed.kind, 'AD_REFERRAL');
  assert.doesNotMatch(parsed.text, /utm_source/u);
});

test('áudio do cliente vira AUDIO e não passa base64/URL no conteúdo', () => {
  const parsed = parseCommercialWhatsappInboundContent(incoming({
    audioMessage: { mimetype: 'audio/ogg; codecs=opus', url: 'https://untrusted.invalid', base64: 'private' },
  }));
  assert.equal(parsed.kind, 'AUDIO');
  assert.doesNotMatch(parsed.text, /base64|private|invalid/u);
});

test('mensagem efêmera encapsulada também extrai texto', () => {
  const parsed = parseCommercialWhatsappInboundContent(incoming({
    ephemeralMessage: { message: { conversation: 'Quero saber como funciona o delivery.' } },
  }));
  assert.equal(parsed.kind, 'TEXT');
  assert.equal(parsed.text, 'Quero saber como funciona o delivery.');
});
