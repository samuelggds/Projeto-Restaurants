import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertHttpTarget,
  assertOperationalEnvironment,
  databaseFingerprint,
  formatDatabaseFingerprint,
  PRODUCTION_UNLOCK_VALUE,
} from './environmentGuard.mjs';
import { requireWriteConfirmation, resolveExecutionMode } from './confirmation.mjs';
import { redactEmail, redactObject, redactText, redactUrl } from './redaction.mjs';

test('databaseFingerprint nunca devolve credenciais', () => {
  const fingerprint = databaseFingerprint(
    'postgresql://admin:very-secret@db:5433/pizza?schema=tenant_a',
  );
  assert.deepEqual(fingerprint, {
    protocol: 'postgresql',
    host: 'db',
    port: '5433',
    database: 'pizza',
    schema: 'tenant_a',
    identityHash: fingerprint.identityHash,
  });
  assert.match(fingerprint.identityHash, /^[a-f0-9]{16}$/u);
  assert.equal(
    formatDatabaseFingerprint(databaseFingerprint('postgresql://admin:secret@db:5433/pizza')),
    `db:5433/pizza?schema=public#${databaseFingerprint('postgresql://admin:secret@db:5433/pizza').identityHash}`,
  );
  assert.doesNotMatch(formatDatabaseFingerprint(fingerprint), /admin|very-secret/u);
});

test('identidade distingue projeto/usuário e schema, mas não muda ao rotacionar senha', () => {
  const first = databaseFingerprint(
    'postgresql://postgres.project_a:old@pooler.example:6543/postgres?schema=public',
  );
  const rotated = databaseFingerprint(
    'postgresql://postgres.project_a:new@pooler.example:6543/postgres?schema=public',
  );
  const otherProject = databaseFingerprint(
    'postgresql://postgres.project_b:new@pooler.example:6543/postgres?schema=public',
  );
  const otherSchema = databaseFingerprint(
    'postgresql://postgres.project_a:new@pooler.example:6543/postgres?schema=private',
  );

  assert.equal(first.identityHash, rotated.identityHash);
  assert.notEqual(first.identityHash, otherProject.identityHash);
  assert.notEqual(first.identityHash, otherSchema.identityHash);
});

test('produção exige dupla liberação', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousUnlock = process.env.OPS_ALLOW_PRODUCTION;
  const previousDatabaseEnvironment = process.env.OPS_DATABASE_ENV;
  const previousFingerprint = process.env.OPS_DATABASE_FINGERPRINT_PRODUCTION;
  process.env.NODE_ENV = 'production';
  process.env.OPS_DATABASE_ENV = 'production';
  process.env.OPS_DATABASE_FINGERPRINT_PRODUCTION = databaseFingerprint(
    'postgresql://user:pass@db/prod',
  ).identityHash;
  delete process.env.OPS_ALLOW_PRODUCTION;
  try {
    assert.throws(
      () =>
        assertOperationalEnvironment({
          targetEnvironment: 'production',
          allowProduction: true,
          databaseUrl: 'postgresql://user:pass@db/prod',
        }),
      /OPS_ALLOW_PRODUCTION/u,
    );
    process.env.OPS_ALLOW_PRODUCTION = PRODUCTION_UNLOCK_VALUE;
    assert.equal(
      assertOperationalEnvironment({
        targetEnvironment: 'production',
        allowProduction: true,
        databaseUrl: 'postgresql://user:pass@db/prod',
      }).target,
      'production',
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousUnlock === undefined) delete process.env.OPS_ALLOW_PRODUCTION;
    else process.env.OPS_ALLOW_PRODUCTION = previousUnlock;
    if (previousDatabaseEnvironment === undefined) delete process.env.OPS_DATABASE_ENV;
    else process.env.OPS_DATABASE_ENV = previousDatabaseEnvironment;
    if (previousFingerprint === undefined) delete process.env.OPS_DATABASE_FINGERPRINT_PRODUCTION;
    else process.env.OPS_DATABASE_FINGERPRINT_PRODUCTION = previousFingerprint;
  }
});

test('produção exige fingerprint allowlisted e rejeita outro banco no mesmo host', () => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    databaseEnvironment: process.env.OPS_DATABASE_ENV,
    unlock: process.env.OPS_ALLOW_PRODUCTION,
    fingerprint: process.env.OPS_DATABASE_FINGERPRINT_PRODUCTION,
  };
  process.env.NODE_ENV = 'production';
  process.env.OPS_DATABASE_ENV = 'production';
  process.env.OPS_ALLOW_PRODUCTION = PRODUCTION_UNLOCK_VALUE;
  const databaseUrl = 'postgresql://postgres.project_a:pass@pooler.example:6543/postgres';

  try {
    delete process.env.OPS_DATABASE_FINGERPRINT_PRODUCTION;
    assert.throws(
      () =>
        assertOperationalEnvironment({
          targetEnvironment: 'production',
          allowProduction: true,
          databaseUrl,
        }),
      /OPS_DATABASE_FINGERPRINT_PRODUCTION é obrigatório/u,
    );

    process.env.OPS_DATABASE_FINGERPRINT_PRODUCTION = databaseFingerprint(
      'postgresql://postgres.project_b:pass@pooler.example:6543/postgres',
    ).identityHash;
    assert.throws(
      () =>
        assertOperationalEnvironment({
          targetEnvironment: 'production',
          allowProduction: true,
          databaseUrl,
        }),
      /não corresponde/u,
    );
  } finally {
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.databaseEnvironment === undefined) delete process.env.OPS_DATABASE_ENV;
    else process.env.OPS_DATABASE_ENV = previous.databaseEnvironment;
    if (previous.unlock === undefined) delete process.env.OPS_ALLOW_PRODUCTION;
    else process.env.OPS_ALLOW_PRODUCTION = previous.unlock;
    if (previous.fingerprint === undefined) delete process.env.OPS_DATABASE_FINGERPRINT_PRODUCTION;
    else process.env.OPS_DATABASE_FINGERPRINT_PRODUCTION = previous.fingerprint;
  }
});

test('ambiente de runtime e identidade do banco são obrigatórios e coerentes', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDatabaseEnvironment = process.env.OPS_DATABASE_ENV;
  try {
    delete process.env.NODE_ENV;
    delete process.env.OPS_DATABASE_ENV;
    assert.throws(
      () =>
        assertOperationalEnvironment({
          targetEnvironment: 'development',
          databaseUrl: 'postgresql://user:pass@db/dev',
        }),
      /NODE_ENV/u,
    );

    process.env.NODE_ENV = 'development';
    process.env.OPS_DATABASE_ENV = 'production';
    assert.throws(
      () =>
        assertOperationalEnvironment({
          targetEnvironment: 'development',
          databaseUrl: 'postgresql://user:pass@db/prod',
        }),
      /marcado como production/u,
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousDatabaseEnvironment === undefined) delete process.env.OPS_DATABASE_ENV;
    else process.env.OPS_DATABASE_ENV = previousDatabaseEnvironment;
  }
});

test('alvo HTTP de produção é rejeitado', () => {
  assert.throws(() => assertHttpTarget('http://api.example.com', 'production'), /HTTPS/u);
  assert.equal(
    assertHttpTarget('https://api.example.com/', 'production'),
    'https://api.example.com',
  );
});

test('escrita é opt-in e exige confirmação exata', () => {
  assert.equal(resolveExecutionMode(), 'dry-run');
  const mode = resolveExecutionMode({ apply: true });
  assert.throws(
    () =>
      requireWriteConfirmation({
        mode,
        provided: 'errado',
        expected: 'APPLY:42',
        action: 'teste',
      }),
    /Confirmação/u,
  );
  assert.doesNotThrow(() =>
    requireWriteConfirmation({
      mode,
      provided: 'APPLY:42',
      expected: 'APPLY:42',
      action: 'teste',
    }),
  );
});

test('redação remove segredos comuns', () => {
  assert.equal(redactEmail('admin@example.com'), 'a***@example.com');
  assert.doesNotMatch(
    redactText(
      'postgresql://admin:secret@db/app Authorization: Bearer abc.def.ghi Basic YWRtaW46c2VjcmV0 {"client_secret":"json-secret"} ?access_token=query-secret',
    ),
    /json-secret|query-secret|YWRtaW46c2VjcmV0|abc\.def\.ghi|admin:secret/u,
  );
  assert.doesNotMatch(
    redactUrl('https://example.com/pay?token=secret#fragment'),
    /secret|fragment/u,
  );
  assert.deepEqual(redactObject({ password: 'secret', nested: { token: 'abc' } }), {
    password: '[REDACTED]',
    nested: { token: '[REDACTED]' },
  });
});
