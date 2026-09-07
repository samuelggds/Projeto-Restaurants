import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isWhatsappPasswordResetConfigured,
  normalizeWhatsappPhone,
  sendWhatsappPasswordResetCode,
} from './whatsappCloudApi.js';

function withEnv(t, values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    const previous = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }
}

test('normalizes Brazilian WhatsApp numbers to digits-only E.164 payload format', () => {
  assert.equal(normalizeWhatsappPhone('(85) 99999-9999'), '5585999999999');
  assert.equal(normalizeWhatsappPhone('+55 85 99999-9999'), '5585999999999');
  assert.equal(normalizeWhatsappPhone('85999999999'), '5585999999999');
});

test('reports password reset integration as disabled without credentials', (t) => {
  withEnv(t, {
    WHATSAPP_ENABLED: 'false',
    WHATSAPP_PHONE_NUMBER_ID: undefined,
    WHATSAPP_ACCESS_TOKEN: undefined,
    WHATSAPP_PASSWORD_RESET_TEMPLATE: undefined,
  });
  assert.equal(isWhatsappPasswordResetConfigured(), false);
});

test('sends the OTP in both body and copy-code button without exposing token in payload', async (t) => {
  withEnv(t, {
    WHATSAPP_ENABLED: 'true',
    WHATSAPP_API_VERSION: 'v25.0',
    WHATSAPP_PHONE_NUMBER_ID: '123456789',
    WHATSAPP_ACCESS_TOKEN: 'test-secret-token',
    WHATSAPP_PASSWORD_RESET_TEMPLATE: 'gastronexa_password_reset',
    WHATSAPP_PASSWORD_RESET_TEMPLATE_LANGUAGE: 'pt_BR',
    WHATSAPP_DEFAULT_COUNTRY_CODE: '55',
    WHATSAPP_REQUEST_TIMEOUT_MS: '5000',
  });

  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.test' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await sendWhatsappPasswordResetCode({
    to: '(85) 99999-9999',
    code: '123456',
  });

  assert.equal(result.sent, true);
  assert.equal(result.messageId, 'wamid.test');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://graph.facebook.com/v25.0/123456789/messages');
  assert.equal(calls[0].init?.headers && (calls[0].init.headers as Record<string, string>).Authorization, 'Bearer test-secret-token');

  const body = JSON.parse(String(calls[0].init?.body));
  assert.equal(body.to, '5585999999999');
  assert.equal(body.template.name, 'gastronexa_password_reset');
  assert.equal(body.template.language.code, 'pt_BR');
  assert.equal(body.template.components[0].parameters[0].text, '123456');
  assert.equal(body.template.components[1].parameters[0].text, '123456');
  assert.equal(JSON.stringify(body).includes('test-secret-token'), false);
});
