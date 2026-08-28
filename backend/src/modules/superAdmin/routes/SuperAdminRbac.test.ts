import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { superAdminMiddleware } from '../../../middlewares/superAdminMiddleware.js';

function invoke(user?: Request['user']) {
  let statusCode = 200;
  let body: unknown;
  let nextCalled = false;
  const req = { user } as Request;
  const res = {
    status(value: number) {
      statusCode = value;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  } as unknown as Response;
  const next = (() => {
    nextCalled = true;
  }) as NextFunction;
  superAdminMiddleware(req, res, next);
  return { statusCode, body, nextCalled };
}

test('RBAC do painel rejeita requisição sem autenticação', () => {
  const result = invoke();
  assert.equal(result.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test('RBAC do painel rejeita ADMIN de restaurante', () => {
  const result = invoke({ id: 2, restaurantId: 1, role: 'ADMIN' });
  assert.equal(result.statusCode, 403);
  assert.equal(result.nextCalled, false);
});

test('RBAC do painel libera exclusivamente SUPER_ADMIN', () => {
  const result = invoke({ id: 1, restaurantId: null, role: 'SUPER_ADMIN' });
  assert.equal(result.statusCode, 200);
  assert.equal(result.nextCalled, true);
});

