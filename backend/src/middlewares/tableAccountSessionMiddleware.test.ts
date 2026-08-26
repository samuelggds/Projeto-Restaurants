// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import tableAccountRepository from '../modules/tableAccount/repositories/TableAccountRepository.js';
import { tableAccountSessionMiddleware } from './tableAccountSessionMiddleware.js';

const originalFindSessionContext = tableAccountRepository.findSessionContextByPublicId;

afterEach(() => {
  tableAccountRepository.findSessionContextByPublicId = originalFindSessionContext;
});

function responseStub() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const sessionPublicId = '123e4567-e89b-42d3-a456-426614174001';

for (const status of ['OPEN', 'CLOSING_REQUESTED']) {
  test(`aceita sessão ${status} e anexa somente o contexto necessário`, async () => {
    tableAccountRepository.findSessionContextByPublicId = async (publicId) => {
      assert.equal(publicId, sessionPublicId);
      return {
        id: 55,
        publicId,
        tableId: 91,
        restaurantId: 7,
        status,
        expiresAt: new Date(Date.now() + 60_000),
        sessionTokenHash: 'não deve ir para a requisição',
      };
    };
    const req = { params: { sessionPublicId } };
    const res = responseStub();
    let nextCalled = false;

    await tableAccountSessionMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.deepEqual(req.tableSession, {
      id: 55,
      publicId: sessionPublicId,
      tableId: 91,
      restaurantId: 7,
      status,
    });
    assert.equal('sessionTokenHash' in req.tableSession, false);
  });
}

test('rejeita UUID inválido sem consultar o banco', async () => {
  let repositoryCalled = false;
  tableAccountRepository.findSessionContextByPublicId = async () => {
    repositoryCalled = true;
  };
  const req = { params: { sessionPublicId: 'mesa-1' } };
  const res = responseStub();
  let nextCalled = false;

  await tableAccountSessionMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(repositoryCalled, false);
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.code, 'TABLE_ACCOUNT_NOT_FOUND');
});

test('não revela se a sessão está encerrada ou pertence a outro contexto', async () => {
  tableAccountRepository.findSessionContextByPublicId = async () => null;
  const req = { params: { sessionPublicId } };
  const res = responseStub();

  await tableAccountSessionMiddleware(req, res, () => {});

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.code, 'TABLE_ACCOUNT_NOT_FOUND');
  assert.match(res.body.error, /não encontrada ou já encerrada/i);
});

test('bloqueia sessão expirada antes de liberar o participante', async () => {
  tableAccountRepository.findSessionContextByPublicId = async () => ({
    id: 55,
    publicId: sessionPublicId,
    tableId: 91,
    restaurantId: 7,
    status: 'OPEN',
    expiresAt: new Date(Date.now() - 1),
  });
  const req = { params: { sessionPublicId } };
  const res = responseStub();
  let nextCalled = false;

  await tableAccountSessionMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'TABLE_ACCOUNT_EXPIRED');
  assert.equal(req.tableSession, undefined);
});

test('converte falha inesperada em resposta genérica sem avançar a cadeia', async () => {
  tableAccountRepository.findSessionContextByPublicId = async () => {
    throw new Error('segredo de infraestrutura');
  };
  const req = { params: { sessionPublicId } };
  const res = responseStub();
  let nextCalled = false;

  await tableAccountSessionMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 500);
  assert.match(res.body.error, /não foi possível validar/i);
  if (process.env.NODE_ENV !== 'development') {
    assert.equal(res.body.detail, undefined);
  }
});
