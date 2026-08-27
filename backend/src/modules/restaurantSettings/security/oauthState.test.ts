// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import { consumeSingleUseOAuthState, createSingleUseOAuthState } from './oauthState.js';

const originalUpsert = prisma.oAuthAuthorizationState.upsert;
const originalUpdateMany = prisma.oAuthAuthorizationState.updateMany;
const originalUserFindFirst = prisma.user.findFirst;
const originalJwtSecret = process.env.JWT_SECRET;
const states = new Map();
const users = new Map();

afterEach(() => {
  prisma.oAuthAuthorizationState.upsert = originalUpsert;
  prisma.oAuthAuthorizationState.updateMany = originalUpdateMany;
  prisma.user.findFirst = originalUserFindFirst;
  process.env.JWT_SECRET = originalJwtSecret;
  states.clear();
  users.clear();
});

function setUser({ id, restaurantId, authVersion = 0, active = true, role = 'ADMIN' }) {
  users.set(id, { id, restaurantId, authVersion, active, role });
}

function installStateStore() {
  process.env.JWT_SECRET = 'oauth-state-test-secret-with-32-characters';
  prisma.user.findFirst = async ({ where }) => {
    const user = users.get(where.id);
    if (
      !user ||
      user.restaurantId !== where.restaurantId ||
      user.role !== where.role ||
      user.active !== where.active
    ) {
      return null;
    }
    return { authVersion: user.authVersion };
  };
  prisma.oAuthAuthorizationState.upsert = async ({ where, create, update }) => {
    const key = `${where.provider_userId.provider}:${where.provider_userId.userId}`;
    const next = states.has(key)
      ? { ...states.get(key), ...update }
      : { consumedAt: null, ...create };
    states.set(key, next);
    return next;
  };
  prisma.oAuthAuthorizationState.updateMany = async ({ where, data }) => {
    const key = `${where.provider}:${where.userId}`;
    const current = states.get(key);
    const user = users.get(where.user.is.id);
    const userMatches =
      user &&
      user.active === where.user.is.active &&
      user.role === where.user.is.role &&
      user.restaurantId === where.user.is.restaurantId &&
      user.authVersion === where.user.is.authVersion;
    const matches =
      current &&
      current.restaurantId === where.restaurantId &&
      current.authVersion === where.authVersion &&
      current.nonceHash === where.nonceHash &&
      current.consumedAt == null &&
      new Date(current.expiresAt).getTime() > new Date(where.expiresAt.gt).getTime() &&
      userMatches;
    if (!matches) return { count: 0 };
    states.set(key, { ...current, ...data });
    return { count: 1 };
  };
}

test('state OAuth só pode ser consumido uma vez', async () => {
  installStateStore();
  setUser({ id: 11, restaurantId: 7, authVersion: 3 });
  const state = await createSingleUseOAuthState({
    provider: 'MERCADO_PAGO',
    restaurantId: 7,
    userId: 11,
  });

  assert.deepEqual(await consumeSingleUseOAuthState(state, 'MERCADO_PAGO'), {
    restaurantId: 7,
    userId: 11,
  });
  assert.equal(states.get('MERCADO_PAGO:11').authVersion, 3);
  await assert.rejects(
    () => consumeSingleUseOAuthState(state, 'MERCADO_PAGO'),
    /reutilizado|substituído/,
  );
});

test('novo início OAuth invalida state anterior do mesmo usuário/provedor', async () => {
  installStateStore();
  setUser({ id: 8, restaurantId: 4 });
  const first = await createSingleUseOAuthState({
    provider: 'PAGBANK',
    restaurantId: 4,
    userId: 8,
  });
  const second = await createSingleUseOAuthState({
    provider: 'PAGBANK',
    restaurantId: 4,
    userId: 8,
  });

  await assert.rejects(() => consumeSingleUseOAuthState(first, 'PAGBANK'), /substituído/);
  assert.deepEqual(await consumeSingleUseOAuthState(second, 'PAGBANK'), {
    restaurantId: 4,
    userId: 8,
  });
});

test('state de um provedor não pode ser usado no callback de outro', async () => {
  installStateStore();
  setUser({ id: 3, restaurantId: 2 });
  const state = await createSingleUseOAuthState({
    provider: 'MERCADO_PAGO',
    restaurantId: 2,
    userId: 3,
  });

  await assert.rejects(() => consumeSingleUseOAuthState(state, 'PAGBANK'), /Estado OAuth inválido/);
});

test('incremento de authVersion revoga state OAuth ainda não consumido', async () => {
  installStateStore();
  setUser({ id: 15, restaurantId: 9, authVersion: 1 });
  const state = await createSingleUseOAuthState({
    provider: 'MERCADO_PAGO',
    restaurantId: 9,
    userId: 15,
  });

  setUser({ id: 15, restaurantId: 9, authVersion: 2 });

  await assert.rejects(
    () => consumeSingleUseOAuthState(state, 'MERCADO_PAGO'),
    /expirado|reutilizado|substituído/,
  );
  assert.equal(states.get('MERCADO_PAGO:15').consumedAt, null);
});

for (const scenario of [
  {
    name: 'usuário inativo',
    change: { active: false },
  },
  {
    name: 'usuário que deixou de ser ADMIN',
    change: { role: 'FUNCIONARIO' },
  },
  {
    name: 'usuário movido para outro restaurante',
    change: { restaurantId: 18 },
  },
]) {
  test(`state OAuth é revogado para ${scenario.name}`, async () => {
    installStateStore();
    setUser({ id: 21, restaurantId: 17, authVersion: 4 });
    const state = await createSingleUseOAuthState({
      provider: 'PAGBANK',
      restaurantId: 17,
      userId: 21,
    });

    setUser({
      id: 21,
      restaurantId: 17,
      authVersion: 4,
      ...scenario.change,
    });

    await assert.rejects(
      () => consumeSingleUseOAuthState(state, 'PAGBANK'),
      /expirado|reutilizado|substituído/,
    );
    assert.equal(states.get('PAGBANK:21').consumedAt, null);
  });
}

test('não cria state para usuário sem vínculo ADMIN ativo com o restaurante', async () => {
  installStateStore();
  setUser({ id: 30, restaurantId: 40, role: 'CLIENTE' });

  await assert.rejects(
    () =>
      createSingleUseOAuthState({
        provider: 'MERCADO_PAGO',
        restaurantId: 40,
        userId: 30,
      }),
    /Administrador inválido/,
  );
  assert.equal(states.size, 0);
});
