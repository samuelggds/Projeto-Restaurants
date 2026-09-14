import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  listAvailableMfaChannels,
  maskMfaPhone,
  normalizeMfaPhone,
  sendMfaCode,
} from './MfaDeliveryService.js';

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

afterEach(() => {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
});

function configureSms() {
  process.env.SMS_ENABLED = 'true';
  process.env.SMS_PROVIDER = 'twilio';
  process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
  process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
  process.env.TWILIO_FROM_NUMBER = '+15551234567';
  process.env.SMS_REQUEST_TIMEOUT_MS = '1000';
  process.env.MFA_DEFAULT_COUNTRY_CODE = '55';
}

function configureWhatsApp() {
  process.env.WHATSAPP_ENABLED = 'true';
  process.env.WHATSAPP_API_VERSION = 'v25.0';
  process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789';
  process.env.WHATSAPP_ACCESS_TOKEN = 'test-whatsapp-token';
  process.env.WHATSAPP_MFA_TEMPLATE = 'gastronexa_login_mfa';
  process.env.WHATSAPP_MFA_TEMPLATE_LANGUAGE = 'pt_BR';
  process.env.WHATSAPP_REQUEST_TIMEOUT_MS = '1000';
  process.env.WHATSAPP_DEFAULT_COUNTRY_CODE = '55';
}

test('normaliza telefone brasileiro e preserva remetente E.164 de SMS', () => {
  assert.equal(normalizeMfaPhone('(85) 99999-1234', '55'), '5585999991234');
  assert.equal(normalizeMfaPhone('+15551234567', ''), '15551234567');
  assert.equal(normalizeMfaPhone('123', '55'), '');
});

test('mascara telefone sem devolver o numero completo', () => {
  const masked = maskMfaPhone('(85) 99999-1234');
  assert.equal(masked.startsWith('+55'), true);
  assert.equal(masked.endsWith('1234'), true);
  assert.equal(masked.includes('99999'), false);
});

test('oferece SMS e WhatsApp somente quando os provedores estao configurados', () => {
  process.env.NODE_ENV = 'production';
  configureSms();
  configureWhatsApp();

  const options = listAvailableMfaChannels({
    email: 'admin@gastronexa.test',
    phone: '(85) 99999-1234',
  });

  assert.deepEqual(
    options.map((option) => option.channel),
    ['SMS', 'WHATSAPP'],
  );
  assert.equal(options.every((option) => !option.destination.includes('99999')), true);
});

test('envia MFA por SMS usando o numero cadastrado', async () => {
  configureSms();
  let requestUrl = '';
  let requestBody = '';
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = String(init?.body || '');
    return new Response(JSON.stringify({ sid: 'SM123' }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  };

  const result = await sendMfaCode({
    channel: 'SMS',
    recipient: { email: 'admin@gastronexa.test', phone: '(85) 99999-1234' },
    code: '123456',
    ttlMinutes: 10,
  });

  assert.match(requestUrl, /api\.twilio\.com/u);
  assert.match(requestBody, /To=%2B5585999991234/u);
  assert.match(requestBody, /123456/u);
  assert.equal(result.destination.includes('99999'), false);
});

test('envia MFA pelo template aprovado do WhatsApp Cloud API', async () => {
  configureWhatsApp();
  let payload: Record<string, unknown> | null = null;
  globalThis.fetch = async (_input, init) => {
    payload = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const result = await sendMfaCode({
    channel: 'WHATSAPP',
    recipient: { email: 'admin@gastronexa.test', phone: '85999991234' },
    code: '654321',
    ttlMinutes: 10,
  });

  assert.equal(payload?.messaging_product, 'whatsapp');
  assert.equal(payload?.to, '5585999991234');
  assert.equal((payload?.template as { name?: string })?.name, 'gastronexa_login_mfa');
  assert.equal(result.destination.includes('99999'), false);
});
