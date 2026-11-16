import assert from 'node:assert/strict';
import test from 'node:test';
import { FuncionarioSubRole, UserRole } from '@prisma/client';
import type { Request } from 'express';
import { waiterMiddleware } from './waiterMiddleware.js';
import { probeRoleAccess } from './security/roleAccessTestHarness.js';

type Identity = NonNullable<Request['user']>;

function identity(overrides: Partial<Identity> = {}): Identity {
  return {
    id: 1,
    role: UserRole.FUNCIONARIO,
    subRole: FuncionarioSubRole.GARCOM,
    restaurantId: 7,
    ...overrides,
  };
}

test('garçom e ADMIN autenticados acessam a rota protegida', async () => {
  for (const user of [identity(), identity({ role: UserRole.ADMIN, subRole: null })]) {
    const result = await probeRoleAccess(waiterMiddleware, user);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { ok: true });
  }
});

test('ausência de autenticação retorna 401 antes de avaliar perfil', async () => {
  const result = await probeRoleAccess(waiterMiddleware, undefined);
  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { error: 'Não autenticado' });
});

test('COZINHA, ATENDENTE, MOTOQUEIRO e CLIENTE não operam como GARCOM', async () => {
  const denied: Identity[] = [
    identity({ subRole: FuncionarioSubRole.COZINHA }),
    identity({ subRole: FuncionarioSubRole.ATENDENTE }),
    identity({ role: UserRole.MOTOQUEIRO, subRole: null }),
    identity({ role: UserRole.CLIENTE, subRole: null }),
  ];
  for (const user of denied) {
    const result = await probeRoleAccess(waiterMiddleware, user);
    assert.equal(result.status, 403);
    assert.match(JSON.stringify(result.body), /administrador ou garçons cadastrados/i);
  }
});

test('identidade autorizada sem restaurante válido não ultrapassa a proteção', async () => {
  for (const restaurantId of [null, 0, -1]) {
    const result = await probeRoleAccess(waiterMiddleware, identity({ restaurantId }));
    assert.equal(result.status, 403);
    assert.match(JSON.stringify(result.body), /Restaurante não identificado/i);
  }
});
