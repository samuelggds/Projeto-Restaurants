// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { FuncionarioSubRole, UserRole } from '@prisma/client';
import { attendantMiddleware } from './attendantMiddleware.js';

function invoke(user) {
  let statusCode = 200;
  let body;
  let nextCalled = false;
  const req = { user };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };

  attendantMiddleware(req, res, () => {
    nextCalled = true;
  });

  return { statusCode, body, nextCalled };
}

test('autoriza somente funcionário ATENDENTE com restaurante identificado', () => {
  const result = invoke({
    id: 7,
    role: UserRole.FUNCIONARIO,
    subRole: FuncionarioSubRole.ATENDENTE,
    restaurantId: 11,
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, 200);
});

test('nega acesso anônimo, administrativo e aos demais perfis operacionais', () => {
  assert.equal(invoke(undefined).statusCode, 401);

  const deniedUsers = [
    { role: UserRole.ADMIN, restaurantId: 11 },
    { role: UserRole.SUPER_ADMIN, restaurantId: null },
    { role: UserRole.CLIENTE, restaurantId: 11 },
    { role: UserRole.MOTOQUEIRO, restaurantId: 11 },
    {
      role: UserRole.FUNCIONARIO,
      subRole: FuncionarioSubRole.COZINHA,
      restaurantId: 11,
    },
    {
      role: UserRole.FUNCIONARIO,
      subRole: FuncionarioSubRole.GARCOM,
      restaurantId: 11,
    },
    {
      role: UserRole.FUNCIONARIO,
      subRole: FuncionarioSubRole.ATENDENTE,
      restaurantId: null,
    },
  ];

  for (const user of deniedUsers) {
    const result = invoke(user);
    assert.equal(result.statusCode, 403, JSON.stringify(user));
    assert.equal(result.nextCalled, false, JSON.stringify(user));
  }
});
