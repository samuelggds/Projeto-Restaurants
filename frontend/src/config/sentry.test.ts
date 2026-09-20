import { expect, it } from 'vitest';
import { sanitizeEvent } from './sentry';

it('discards request bodies and headers and redacts browser telemetry', () => {
  const event = sanitizeEvent({
    request: {
      url: 'https://api.example.test/login?token=private-query',
      data: 'private-body',
      headers: { authorization: 'private-header' },
      cookies: { session: 'private-cookie' },
    },
    user: { email: 'private-user@example.test' },
    extra: { cardToken: 'private-card', password: 'private-password' },
    breadcrumbs: [{ data: { Authorization: 'private-authorization' } }],
    exception: {
      values: [
        {
          value: 'Bearer private-bearer',
          stacktrace: { frames: [{ vars: { hidden: 'private-frame' } }] },
        },
      ],
    },
  });
  expect(event.request.url).toBe('https://api.example.test/login');
  expect(JSON.stringify(event)).not.toContain('private-');
});
