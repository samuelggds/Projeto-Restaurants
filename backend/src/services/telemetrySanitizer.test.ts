import assert from 'node:assert/strict';
import test from 'node:test';
import {
  limitTelemetryText,
  redactTelemetryText,
  safeErrorName,
  safeErrorSummary,
  sanitizeTelemetryValue,
  telemetryPath,
} from './telemetrySanitizer.js';

test('redactTelemetryText remove credenciais, tokens e PII básica de texto livre', () => {
  const input = [
    'Bearer secret-token',
    'jwt=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature',
    'password=my-password',
    'postgresql://admin:db-password@db.internal/app',
    'email admin@example.com',
    'cpf 123.456.789-00',
    'cnpj 12.345.678/0001-90',
    'telefone +55 (11) 99999-8888',
  ].join(' ');

  const result = redactTelemetryText(input);

  for (const secret of [
    'secret-token',
    'signature',
    'my-password',
    'db-password',
    'admin@example.com',
    '123.456.789-00',
    '12.345.678/0001-90',
    '99999-8888',
  ]) {
    assert.doesNotMatch(result, new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  }
  assert.match(result, /\[REDACTED/);
});

test('sanitizeTelemetryValue redige por chave, trata ciclos e impõe orçamento global', () => {
  const input: Record<string, unknown> = {
    authorization: 'Bearer abc',
    profile: {
      email: 'person@example.com',
      phone: '(11) 99999-0000',
      accessToken: 'camel-case-secret',
      oauthState: 'state-secret',
      publicId: 42,
      nested: { token: 'secret', status: 'ok' },
    },
    values: ['safe', 'also-safe', 'overflow'],
  };
  input.self = input;

  const result = sanitizeTelemetryValue(input, { maxEntries: 20 }) as Record<string, any>;

  assert.equal(result.authorization, '[REDACTED]');
  assert.equal(result.profile.email, '[REDACTED]');
  assert.equal(result.profile.phone, '[REDACTED]');
  assert.equal(result.profile.accessToken, '[REDACTED]');
  assert.equal(result.profile.oauthState, '[REDACTED]');
  assert.equal(result.profile.publicId, 42);
  assert.equal(result.profile.nested.token, '[REDACTED]');
  assert.equal(result.self, '[CIRCULAR]');

  const limited = sanitizeTelemetryValue(
    { one: 1, two: 2, three: 3, four: 4 },
    { maxEntries: 2 },
  ) as Record<string, unknown>;
  assert.deepEqual(limited, { one: 1, two: 2, '[TRUNCATED]': true });
});

test('limites de texto e profundidade preservam tamanho máximo', () => {
  assert.equal(limitTelemetryText('abcdefghij', 8).length, 8);
  assert.equal(redactTelemetryText('x'.repeat(100), 32).length, 32);
  assert.deepEqual(sanitizeTelemetryValue({ a: { b: { c: true } } }, { maxDepth: 2 }), {
    a: { b: '[TRUNCATED]' },
  });
});

test('telemetryPath remove query, fragmento, credenciais e redige PII na rota', () => {
  assert.equal(
    telemetryPath('https://user:password@example.com/customers/admin@example.com?token=abc#x'),
    'https://example.com/customers/[REDACTED_EMAIL]',
  );
  assert.equal(telemetryPath('/orders/123?access_token=secret'), '/orders/123');
});

test('safeErrorSummary mantém apenas nome e mensagem redigida, sem stack', () => {
  const error = new TypeError('failed for admin@example.com with token=top-secret');
  error.stack = 'STACK_WITH_SECRET';

  const summary = safeErrorSummary(error, 120);

  assert.equal(safeErrorName(error), 'TypeError');
  assert.match(summary, /^TypeError:/);
  assert.doesNotMatch(summary, /admin@example\.com|top-secret|STACK_WITH_SECRET/u);
});
