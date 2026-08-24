// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { FuncionarioSubRole, UserRole } from '@prisma/client';
import { waiterMiddleware } from './waiterMiddleware.js';

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
  waiterMiddleware(req, res, () => {
    nextCalled = true;
  });
  return { statusCode, body, nextCalled };
}

test('autoriza somente admin ou funcionário GARCOM do restaurante autenticado', () => {
  assert.equal(
    invoke({ id: 1, role: UserRole.ADMIN, restaurantId: 7 }).nextCalled,
    true,
  );
  assert.equal(
    invoke({
      id: 2,
      role: UserRole.FUNCIONARIO,
      subRole: FuncionarioSubRole.GARCOM,
      restaurantId: 7,
    }).nextCalled,
    true,
  );
});

test('nega cozinha, motoqueiro e token sem restaurantId', () => {
  const kitchen = invoke({
    id: 2,
    role: UserRole.FUNCIONARIO,
    subRole: FuncionarioSubRole.COZINHA,
    restaurantId: 7,
  });
  assert.equal(kitchen.statusCode, 403);
  assert.match(kitchen.body.error, /garçons cadastrados/i);

  assert.equal(
    invoke({ id: 3, role: UserRole.MOTOQUEIRO, restaurantId: 7 }).statusCode,
    403,
  );
  assert.equal(
    invoke({
      id: 2,
      role: UserRole.FUNCIONARIO,
      subRole: FuncionarioSubRole.GARCOM,
      restaurantId: null,
    }).statusCode,
    403,
  );
});
