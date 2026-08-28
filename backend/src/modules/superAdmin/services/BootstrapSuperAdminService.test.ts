// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { BootstrapSuperAdminService } from './BootstrapSuperAdminService.js';

const securePassword = 'V3ry-Str0ng-Bootstrap!';

function productionEnv(overrides = {}) {
  return {
    NODE_ENV: 'production',
    SUPER_ADMIN_BOOTSTRAP_ENABLED: 'true',
    SUPER_ADMIN_BOOTSTRAP_EMAIL: 'developer@example.com',
    SUPER_ADMIN_BOOTSTRAP_NAME: 'Desenvolvedor',
    SUPER_ADMIN_BOOTSTRAP_PASSWORD: securePassword,
    ...overrides,
  };
}

function createHarness({ superAdmins = [], accountWithEmail = null } = {}) {
  const calls = {
    advisoryLocks: 0,
    userCreates: [],
    auditCreates: [],
    hashInputs: [],
    secretFiles: [],
  };
  const transaction = {
    $queryRaw: async () => {
      calls.advisoryLocks += 1;
      return [{ pg_advisory_xact_lock: null }];
    },
    user: {
      findMany: async () => superAdmins,
      findFirst: async () => accountWithEmail,
      create: async ({ data }) => {
        calls.userCreates.push(data);
        return { id: 91, name: data.name };
      },
    },
    auditLog: {
      create: async ({ data }) => {
        calls.auditCreates.push(data);
        return { id: 1, ...data };
      },
    },
  };
  const database = {
    $transaction: async (callback) => callback(transaction),
  };
  const dependencies = {
    hashPassword: async (password) => {
      calls.hashInputs.push(password);
      return 'bcrypt-hash';
    },
    readSecretFile: async (file) => {
      calls.secretFiles.push(file);
      return securePassword;
    },
  };

  return {
    calls,
    service: new BootstrapSuperAdminService(database, dependencies),
  };
}

test('reinício apenas confirma o único SUPER_ADMIN esperado e não relê a senha', async () => {
  const { service, calls } = createHarness({
    superAdmins: [
      {
        id: 7,
        email: 'developer@example.com',
        active: true,
        restaurantId: null,
        subRole: null,
        mfaEnabled: true,
      },
    ],
  });

  assert.deepEqual(
    await service.execute(productionEnv({ SUPER_ADMIN_BOOTSTRAP_PASSWORD: '' })),
    { status: 'ready', userId: 7 },
  );
  assert.equal(calls.advisoryLocks, 1);
  assert.deepEqual(calls.hashInputs, []);
  assert.deepEqual(calls.userCreates, []);
});

test('primeira inicialização cria conta isolada, MFA e troca obrigatória de senha', async () => {
  const { service, calls } = createHarness();

  assert.deepEqual(await service.execute(productionEnv()), {
    status: 'created',
    userId: 91,
  });
  assert.deepEqual(calls.hashInputs, [securePassword]);
  assert.equal(calls.userCreates.length, 1);
  assert.deepEqual(calls.userCreates[0], {
    name: 'Desenvolvedor',
    email: 'developer@example.com',
    password: 'bcrypt-hash',
    role: 'SUPER_ADMIN',
    active: true,
    restaurantId: null,
    subRole: null,
    mfaEnabled: true,
    mustChangePassword: true,
  });
  assert.deepEqual(calls.auditCreates[0], {
    userId: 91,
    userName: 'Desenvolvedor',
    userRole: 'SUPER_ADMIN',
    action: 'BOOTSTRAP_SUPER_ADMIN',
    resource: 'User:91',
    result: 'SUCCESS',
  });
});

test('aceita secret file e nunca persiste a senha original', async () => {
  const { service, calls } = createHarness();

  await service.execute(
    productionEnv({
      SUPER_ADMIN_BOOTSTRAP_PASSWORD: '',
      SUPER_ADMIN_BOOTSTRAP_PASSWORD_FILE: '/run/secrets/super_admin_password',
    }),
  );

  assert.deepEqual(calls.secretFiles, ['/run/secrets/super_admin_password']);
  assert.equal(calls.userCreates[0].password, 'bcrypt-hash');
  assert.notEqual(calls.userCreates[0].password, securePassword);
});

test('falha fechada para duplicidade, identidade diferente ou email já ocupado', async () => {
  const validAdmin = {
    id: 7,
    email: 'developer@example.com',
    active: true,
    restaurantId: null,
    subRole: null,
    mfaEnabled: true,
  };

  await assert.rejects(
    createHarness({ superAdmins: [validAdmin, { ...validAdmin, id: 8 }] }).service.execute(
      productionEnv(),
    ),
    /Mais de um SUPER_ADMIN/u,
  );
  await assert.rejects(
    createHarness({
      superAdmins: [{ ...validAdmin, email: 'other@example.com' }],
    }).service.execute(productionEnv()),
    /não corresponde/u,
  );
  await assert.rejects(
    createHarness({ accountWithEmail: { id: 22 } }).service.execute(productionEnv()),
    /email de bootstrap já pertence/u,
  );
});
