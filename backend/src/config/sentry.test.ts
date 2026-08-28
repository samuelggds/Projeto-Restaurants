import assert from 'node:assert/strict';
import test from 'node:test';
import type { ErrorEvent } from '@sentry/node';
import { sanitizeEvent } from './sentry.js';

test('beforeSend remove query, credenciais, PII e variáveis sensíveis do evento', () => {
  const event: ErrorEvent = {
    type: undefined,
    request: {
      url: 'https://api.example.com/oauth/callback?code=secret-code&state=secret-state',
      query_string: 'code=secret-code',
      cookies: { session: 'secret-cookie' },
      headers: { authorization: 'Bearer secret-token', 'user-agent': 'test' },
      data: { payerEmail: 'payer@example.com', accessToken: 'secret-access-token' },
    },
    user: { id: '7', email: 'admin@example.com', ip_address: '127.0.0.1' },
    exception: {
      values: [
        {
          type: 'Error',
          value: 'request failed token=provider-secret for admin@example.com',
          stacktrace: { frames: [{ vars: { password: 'secret-password', safe: true } }] },
        },
      ],
    },
  };

  const result = sanitizeEvent(event);

  assert.equal(result.request?.url, 'https://api.example.com/oauth/callback');
  assert.equal(result.request?.query_string, undefined);
  assert.equal(result.request?.cookies, undefined);
  assert.equal(result.request?.headers?.authorization, '[REDACTED]');
  assert.deepEqual(result.request?.data, {
    payerEmail: '[REDACTED]',
    accessToken: '[REDACTED]',
  });
  assert.deepEqual(result.user, { id: '7' });
  assert.doesNotMatch(
    result.exception?.values?.[0]?.value || '',
    /provider-secret|admin@example\.com/u,
  );
  assert.equal(result.exception?.values?.[0]?.stacktrace?.frames?.[0]?.vars?.password, '[REDACTED]');
});
