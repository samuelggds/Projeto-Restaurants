import assert from 'node:assert/strict';
import test from 'node:test';

import { parseSafeTenantE2EDatabaseUrl, redactDatabaseUrl } from './tenantE2eDatabaseSafety.mjs';

test('aceita somente PostgreSQL loopback com nome inequivocamente descartável', () => {
  const result = parseSafeTenantE2EDatabaseUrl(
    'postgresql://tenant:secret@127.0.0.1:55432/tenant_e2e?schema=public',
  );

  assert.equal(result.databaseName, 'tenant_e2e');
});

test('recusa banco remoto mesmo quando o nome parece ser de teste', () => {
  assert.throws(
    () =>
      parseSafeTenantE2EDatabaseUrl(
        'postgresql://tenant:secret@database.example.com:5432/tenant_e2e',
      ),
    /localhost\/loopback/,
  );
});

test('recusa banco local sem marcador de teste no nome', () => {
  assert.throws(
    () => parseSafeTenantE2EDatabaseUrl('postgresql://tenant:secret@localhost:5432/pizza'),
    /nome do banco/,
  );
});

test('não expõe a senha ao registrar a URL do banco', () => {
  const redacted = redactDatabaseUrl(
    'postgresql://tenant:super-secret@localhost:5432/tenant_test?schema=public',
  );

  assert.doesNotMatch(redacted, /super-secret/);
  assert.match(redacted, /\*\*\*/);
});
