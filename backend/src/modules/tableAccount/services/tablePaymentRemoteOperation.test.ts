// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import { executeTablePaymentRemoteOperation, resolveExistingTablePaymentProvider } from './tablePaymentRemoteOperation.js';

const originals = { transaction: prisma.$transaction, updateMany: prisma.tablePaymentEvent.updateMany };
afterEach(() => { prisma.$transaction = originals.transaction; prisma.tablePaymentEvent.updateMany = originals.updateMany; });
const intent = { id: 91, publicId: 'table-payment-91', restaurantId: 7, tableSessionId: 55, payerParticipantId: 80,
  provider: 'MERCADO_PAGO', providerExternalId: '1234', method: 'PIX', status: 'PAID', totalCents: 3000n };
const evidence = (status = 'REFUNDED', overrides = {}) => ({ externalId: '1234', status, amountCents: 3000, ...overrides });
function setup() {
  const records = new Map();
  let queue = Promise.resolve();
  prisma.$transaction = (callback) => {
    const result = queue.then(() => callback({ $queryRaw: async () => [], tablePaymentEvent: {
      findUnique: async ({ where }) => records.get(where.deduplicationKey) || null,
      create: async ({ data }) => { records.set(data.deduplicationKey, { id: records.size + 1, ...data }); },
    } }));
    queue = result.catch(() => {});
    return result;
  };
  prisma.tablePaymentEvent.updateMany = async ({ where, data }) => {
    const record = records.get(where.deduplicationKey);
    if (record.metadata.state !== 'CONFIRMED') Object.assign(record, data);
    return { count: 1 };
  };
  return records;
}

test('resolve gateway persistido, sem usar fake por padrão nem aceitar provider divergente', () => {
  assert.equal(resolveExistingTablePaymentProvider(intent).code, 'MERCADO_PAGO');
  assert.throws(() => resolveExistingTablePaymentProvider(intent, { code: 'FAKE_TABLE' }), /não corresponde/);
});

test('estorno confirmado usa um claim durável e replay não repete rede', async () => {
  const records = setup();
  let calls = 0;
  const provider = { code: 'MERCADO_PAGO', refundPayment: async () => { calls++; return evidence(); }, getPayment: async () => { throw Error('não deve consultar novamente'); } };
  assert.equal((await executeTablePaymentRemoteOperation(intent, 'refund', provider)).confirmed, true);
  assert.equal((await executeTablePaymentRemoteOperation(intent, 'refund', provider)).confirmed, true);
  assert.equal(calls, 1);
  assert.equal(records.size, 1);
  assert.equal([...records.values()][0].metadata.state, 'CONFIRMED');
});

for (const bad of [evidence('PENDING'), evidence('REFUNDED', { amountCents: 1 }), evidence('REFUNDED', { externalId: 'other' })]) {
  test(`não registra sucesso para retorno ${bad.status}/${bad.amountCents}/${bad.externalId}`, async () => {
    const records = setup();
    const outcome = await executeTablePaymentRemoteOperation(intent, 'refund', { code: 'MERCADO_PAGO', refundPayment: async () => bad });
    assert.equal(outcome.confirmed, false);
    assert.equal(outcome.manualReviewRequired, true);
    assert.equal([...records.values()][0].metadata.state, 'PENDING');
  });
}

test('falha ambígua não reenvia estorno: repetição consulta e confirma o valor já devolvido', async () => {
  setup();
  let mutations = 0;
  let reads = 0;
  const provider = { code: 'MERCADO_PAGO', refundPayment: async () => { mutations++; throw Error('timeout após envio'); },
    getPayment: async () => { reads++; return evidence(); } };
  assert.equal((await executeTablePaymentRemoteOperation(intent, 'refund', provider)).confirmed, false);
  assert.equal((await executeTablePaymentRemoteOperation(intent, 'refund', provider)).confirmed, true);
  assert.equal(mutations, 1);
  assert.equal(reads, 1);
});

test('duas solicitações concorrentes não enviam dois estornos', async () => {
  setup();
  let mutations = 0;
  let finish;
  let started;
  const waiting = new Promise((resolve) => { started = resolve; });
  const provider = { code: 'MERCADO_PAGO', refundPayment: async () => { mutations++; started(); return new Promise((resolve) => { finish = resolve; }); }, getPayment: async () => evidence('PENDING') };
  const first = executeTablePaymentRemoteOperation(intent, 'refund', provider);
  await waiting;
  const second = await executeTablePaymentRemoteOperation(intent, 'refund', provider);
  assert.equal(second.confirmed, false);
  finish(evidence());
  assert.equal((await first).confirmed, true);
  assert.equal(mutations, 1);
});

test('cancelamento remoto não suportado fica registrado para revisão manual', async () => {
  const records = setup();
  const result = await executeTablePaymentRemoteOperation({ ...intent, status: 'CANCELED' }, 'cancel', {
    code: 'MERCADO_PAGO', cancelPayment: async () => { throw Error('não suportado'); },
  });
  assert.equal(result.confirmed, false);
  assert.equal([...records.values()][0].metadata.operation, 'cancel');
});
