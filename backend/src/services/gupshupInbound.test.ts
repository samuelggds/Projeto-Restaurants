// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import {
  buildTenantStoreUrl,
  buildTenantWhatsappGreeting,
  parseGupshupInboundMessage,
} from './gupshupInbound.js';
import { resolveGupshupSourceForAppName } from './whatsappProvider.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

test('monta a saudação configurada pelo ADMIN com o link fixo do tenant', () => {
  assert.equal(
    buildTenantWhatsappGreeting({
      configuredMessage: 'Olá! 👋 Bem-vindo ao nosso atendimento. Como podemos ajudar?',
      restaurantName: 'North Pizza',
      restaurantSlug: 'North-Pizza',
    }),
    'Olá! 👋 Bem-vindo ao nosso atendimento. Como podemos ajudar?\n\nhttps://www.gastronexa.com.br/north-pizza',
  );
});

test('usa mensagem padrão sem permitir trocar o domínio da loja', () => {
  assert.equal(buildTenantStoreUrl('/pizzaria-teste/'), 'https://www.gastronexa.com.br/pizzaria-teste');
  assert.equal(
    buildTenantWhatsappGreeting({ restaurantName: 'Pizzaria Teste', restaurantSlug: 'pizzaria-teste' }),
    'Olá! 👋 Bem-vindo ao Pizzaria Teste. Como podemos ajudar?\n\nhttps://www.gastronexa.com.br/pizzaria-teste',
  );
});

test('interpreta somente callbacks de mensagem recebida da Gupshup', () => {
  assert.deepEqual(
    parseGupshupInboundMessage({
      app: 'TenantApp',
      type: 'message',
      payload: {
        id: 'msg-123',
        source: '5585988887777',
        type: 'text',
        payload: { text: 'Olá' },
      },
    }),
    {
      appName: 'TenantApp',
      providerMessageId: 'msg-123',
      customerPhone: '5585988887777',
      messageType: 'text',
    },
  );

  assert.equal(parseGupshupInboundMessage({ app: 'TenantApp', type: 'message-event' }), null);
});

test('resolve o número do restaurante pelo app multi-tenant da Gupshup', () => {
  process.env.GUPSHUP_APP_BY_SOURCE_JSON = JSON.stringify({
    '5585999999999': 'RestaurantA',
    '5511988887777': 'RestaurantB',
  });
  delete process.env.GUPSHUP_APP_NAME;
  delete process.env.GUPSHUP_SOURCE_NUMBER;

  assert.equal(resolveGupshupSourceForAppName('RestaurantA'), '5585999999999');
  assert.equal(resolveGupshupSourceForAppName('RestaurantB'), '5511988887777');
});
