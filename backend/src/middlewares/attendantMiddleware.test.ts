import assert from 'node:assert/strict';
import test from 'node:test';
import { FuncionarioSubRole, UserRole } from '@prisma/client';
import type { Request } from 'express';
import { attendantMiddleware } from './attendantMiddleware.js';
import { probeRoleAccess } from './security/roleAccessTestHarness.js';

type Identity = NonNullable<Request['user']>;

function identity(overrides: Partial<Identity> = {}): Identity {
  return {
    id: 7,
    role: UserRole.FUNCIONARIO,
    subRole: FuncionarioSubRole.ATENDENTE,
    restaurantId: 11,
    ...overrides,
  };
}

test('ATENDENTE autenticado pode acessar a rota operacional', async () => {
  const result = await probeRoleAccess(attendantMiddleware, identity());
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { ok: true });
});

test('ausência de autenticação retorna 401', async () => {
  const result = await probeRoleAccess(attendantMiddleware, undefined);
  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { error: 'Não autenticado' });
});

test('ADMIN, SUPER_ADMIN, CLIENTE e outros funcionários não assumem perfil ATENDENTE', async () => {
  const denied: Identity[] = [
    identity({ role: UserRole.ADMIN, subRole: null }),
    identity({ role: UserRole.SUPER_ADMIN, subRole: null, restaurantId: null }),
    identity({ role: UserRole.CLIENTE, subRole: null }),
    identity({ role: UserRole.MOTOQUEIRO, subRole: null }),
    identity({ subRole: FuncionarioSubRole.COZINHA }),
    identity({ subRole: FuncionarioSubRole.GARCOM }),
  ];
  for (const user of denied) {
    const result = await probeRoleAccess(attendantMiddleware, user);
    assert.equal(result.status, 403);
    assert.match(JSON.stringify(result.body), /atendentes cadastrados/i);
  }
});

test('ATENDENTE sem restaurante válido recebe 403', async () => {
  for (const restaurantId of [null, 0, -1]) {
    const result = await probeRoleAccess(attendantMiddleware, identity({ restaurantId }));
    assert.equal(result.status, 403);
    assert.match(JSON.stringify(result.body), /Restaurante não identificado/i);
  }
});
