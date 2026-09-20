import assert from 'node:assert/strict';
import test from 'node:test';
import { isBoundedEmail } from './boundedEmail.js';

test('commercial emails support subdomains and reject malformed/oversized input', () => {
  for (const email of ['ops@example.com', 'contato+loja@sub.example.com.br'])
    assert.equal(isBoundedEmail(email), true);
  for (const email of [
    '',
    'a@@example.com',
    'a@localhost',
    'a@.com',
    'a@site.',
    'a b@site.com',
    'a@' + '.'.repeat(200_000) + ' !',
  ]) {
    assert.equal(isBoundedEmail(email), false);
  }
});
