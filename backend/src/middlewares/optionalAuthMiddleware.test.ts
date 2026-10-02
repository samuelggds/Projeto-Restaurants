import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { optionalTableSessionAuthMiddleware } from './optionalAuthMiddleware.js';

function mockResponse() {
  let statusCode = 200;
  let body: unknown = null;
  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(payload: unknown) {
      body = payload;
      return response;
    },
  } as unknown as Response;

  return {
    response,
    statusCode: () => statusCode,
    body: () => body,
  };
}

test('sessão de mesa válida pode ignorar Authorization antigo inválido e seguir para validação da mesa', async () => {
  const req = {
    headers: {
      authorization: 'Bearer token-invalido',
      'x-session-token': 'opaque-table-session-token',
    },
  } as unknown as Request;
  const res = mockResponse();
  let nextCalls = 0;
  const next = (() => {
    nextCalls += 1;
  }) as NextFunction;

  await optionalTableSessionAuthMiddleware(req, res.response, next);

  assert.equal(nextCalls, 1);
  assert.equal(res.statusCode(), 200);
  assert.equal(res.body(), null);
  assert.equal(req.user, undefined);
});

test('Authorization malformado sem token de mesa continua fail-closed', async () => {
  const req = {
    headers: {
      authorization: 'Basic credencial-invalida',
    },
  } as unknown as Request;
  const res = mockResponse();
  let nextCalls = 0;
  const next = (() => {
    nextCalls += 1;
  }) as NextFunction;

  await optionalTableSessionAuthMiddleware(req, res.response, next);

  assert.equal(nextCalls, 0);
  assert.equal(res.statusCode(), 401);
  assert.deepEqual(res.body(), { error: 'Token inválido!' });
});

test('sem Authorization o middleware opcional deixa a autenticação da mesa decidir o acesso', async () => {
  const req = {
    headers: {
      'x-session-token': 'opaque-table-session-token',
    },
  } as unknown as Request;
  const res = mockResponse();
  let nextCalls = 0;
  const next = (() => {
    nextCalls += 1;
  }) as NextFunction;

  await optionalTableSessionAuthMiddleware(req, res.response, next);

  assert.equal(nextCalls, 1);
  assert.equal(res.statusCode(), 200);
});
