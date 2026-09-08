import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { z } from 'zod';
import controller from './CreateOrderController.js';
import service from '../services/CreateOrderService.js';
import { OrderRequestError } from '../domain/OrderRequestError.js';

const originalExecute = service.execute;
afterEach(() => { service.execute = originalExecute; });

async function invoke() {
  let status = 0;
  let body: Record<string, unknown> = {};
  const req = { body: {}, headers: {}, user: { id: 7, restaurantId: 3 }, requestId: 'request-test' } as unknown as Request;
  const res = {
    status(code: number) { status = code; return res; },
    json(value: Record<string, unknown>) { body = value; return res; },
  } as unknown as Response;
  await controller.handle(req, res);
  return { status, body };
}

test('criação não expõe metadados privados da tentativa mesmo com retorno interno completo', async () => {
  service.execute = async () => ({ id: 91, total: 12, creationActor: 'actor-secret', creationRequestKey: 'key-secret', creationFingerprint: 'fingerprint-secret' }) as unknown as Awaited<ReturnType<typeof service.execute>>;
  const result = await invoke();
  assert.equal(result.status, 201);
  assert.deepEqual(result.body, { id: 91, total: 12 });
});

test('falha inesperada não revela mensagem de banco e mantém requestId', async () => {
  service.execute = async () => { throw new Error('postgres://private-user:secret@internal/database'); };
  const originalConsoleError = console.error;
  const logs: unknown[][] = [];
  console.error = (...args: unknown[]) => { logs.push(args); };
  try {
    const result = await invoke();
    assert.equal(result.status, 500);
    assert.equal(result.body.requestId, 'request-test');
    assert.equal(JSON.stringify([result, logs]).includes('secret'), false);
    assert.equal(result.body.error, 'Não foi possível criar o pedido. Tente novamente.');
  } finally { console.error = originalConsoleError; }
});

test('conflitos e dados inválidos conservam respostas de domínio', async () => {
  service.execute = async () => { throw new OrderRequestError('Tentativa incompatível.', 409, 'IDEMPOTENCY_CONFLICT'); };
  assert.deepEqual(await invoke(), { status: 409, body: { error: 'Tentativa incompatível.', code: 'IDEMPOTENCY_CONFLICT', requestId: 'request-test' } });
  service.execute = async () => { z.object({ items: z.array(z.number()).min(1, 'Inclua um item.') }).parse({ items: [] }); throw new Error('unreachable'); };
  assert.deepEqual(await invoke(), { status: 400, body: { error: 'Inclua um item.', requestId: 'request-test' } });
});
