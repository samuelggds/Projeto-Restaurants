import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertActiveSuperAdminContinuity,
  buildAdminChangeConfirmation,
  buildSuperAdminAfterState,
  snapshotsMatch,
} from './adminChangePlan.mjs';

const promotionInput = {
  action: 'PROMOTE_SUPER_ADMIN',
  databaseLabel: 'db:5432/pizza',
  email: 'admin@example.com',
  targetId: 42,
  before: {
    role: 'ADMIN',
    subRole: null,
    restaurantId: 8,
    active: false,
    authVersion: 3,
    mfaEnabled: false,
    mustChangePassword: false,
  },
  after: {
    role: 'SUPER_ADMIN',
    subRole: null,
    restaurantId: null,
    active: true,
    authVersion: 4,
    mfaEnabled: true,
    mustChangePassword: true,
  },
  requested: {
    activate: true,
    resetPassword: true,
    createIfMissing: false,
    name: null,
    passwordEnvironmentKey: 'ADMIN_PASSWORD',
  },
};

test('confirmação administrativa é estável e independente da ordem das chaves', () => {
  const first = buildAdminChangeConfirmation(promotionInput);
  const reordered = buildAdminChangeConfirmation({
    ...promotionInput,
    requested: {
      passwordEnvironmentKey: 'ADMIN_PASSWORD',
      name: null,
      createIfMissing: false,
      resetPassword: true,
      activate: true,
    },
  });
  assert.equal(first, reordered);
  assert.match(first, /^PROMOTE_SUPER_ADMIN:42:db:5432\/pizza:[a-f0-9]{24}$/u);
});

test('confirmação muda com alvo, estados e cada flag de promoção', () => {
  const baseline = buildAdminChangeConfirmation(promotionInput);
  const variants = [
    { ...promotionInput, email: 'other@example.com' },
    { ...promotionInput, targetId: 43 },
    { ...promotionInput, before: { ...promotionInput.before, authVersion: 4 } },
    { ...promotionInput, after: { ...promotionInput.after, active: false } },
    {
      ...promotionInput,
      requested: { ...promotionInput.requested, activate: false },
    },
    {
      ...promotionInput,
      requested: { ...promotionInput.requested, resetPassword: false },
    },
    {
      ...promotionInput,
      requested: { ...promotionInput.requested, createIfMissing: true },
    },
  ];

  for (const variant of variants) {
    assert.notEqual(buildAdminChangeConfirmation(variant), baseline);
  }
});

test('proteção impede demover ou desativar o último SUPER_ADMIN ativo', () => {
  const before = { role: 'SUPER_ADMIN', active: true };
  assert.throws(
    () =>
      assertActiveSuperAdminContinuity({
        before,
        after: { role: 'ADMIN', active: true },
        activeSuperAdminCount: 1,
      }),
    /último SUPER_ADMIN ativo/u,
  );
  assert.throws(
    () =>
      assertActiveSuperAdminContinuity({
        before,
        after: { role: 'SUPER_ADMIN', active: false },
        activeSuperAdminCount: 1,
      }),
    /último SUPER_ADMIN ativo/u,
  );
  assert.doesNotThrow(() =>
    assertActiveSuperAdminContinuity({
      before,
      after: { role: 'ADMIN', active: true },
      activeSuperAdminCount: 2,
    }),
  );
  assert.doesNotThrow(() =>
    assertActiveSuperAdminContinuity({
      before: { role: 'SUPER_ADMIN', active: false },
      after: { role: 'ADMIN', active: false },
      activeSuperAdminCount: 1,
    }),
  );
});

test('promoção sempre habilita MFA e reset sempre exige troca de senha', () => {
  const existing = {
    active: false,
    authVersion: 9,
    mfaEnabled: false,
    mustChangePassword: false,
  };
  assert.deepEqual(buildSuperAdminAfterState({ existing, activate: false, resetPassword: false }), {
    role: 'SUPER_ADMIN',
    subRole: null,
    restaurantId: null,
    active: false,
    authVersion: 10,
    mfaEnabled: true,
    mustChangePassword: false,
  });
  assert.equal(
    buildSuperAdminAfterState({ existing, activate: true, resetPassword: true }).mustChangePassword,
    true,
  );
  assert.equal(
    buildSuperAdminAfterState({ existing: null, activate: false, resetPassword: false })
      .mustChangePassword,
    true,
  );
});

test('confirmação de papel muda com subpapel e versões before/after', () => {
  const input = {
    action: 'SET_USER_ROLE',
    databaseLabel: 'db:5432/pizza',
    email: 'employee@example.com',
    targetId: 15,
    before: { role: 'FUNCIONARIO', subRole: 'GARCOM', active: true, authVersion: 2 },
    after: { role: 'FUNCIONARIO', subRole: 'COZINHA', active: true, authVersion: 3 },
    requested: { role: 'FUNCIONARIO', subRole: 'COZINHA' },
  };
  const baseline = buildAdminChangeConfirmation(input);
  assert.notEqual(
    buildAdminChangeConfirmation({
      ...input,
      before: { ...input.before, authVersion: 1 },
    }),
    baseline,
  );
  assert.notEqual(
    buildAdminChangeConfirmation({
      ...input,
      after: { ...input.after, subRole: 'GARCOM' },
    }),
    baseline,
  );
});

test('comparação de snapshot detecta mudança nos campos protegidos', () => {
  const expected = { id: 7, role: 'ADMIN', active: true, authVersion: 2 };
  assert.equal(snapshotsMatch({ ...expected }, expected, Object.keys(expected)), true);
  assert.equal(
    snapshotsMatch({ ...expected, authVersion: 3 }, expected, Object.keys(expected)),
    false,
  );
});
