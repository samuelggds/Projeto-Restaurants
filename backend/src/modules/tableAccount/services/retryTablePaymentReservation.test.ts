import assert from 'node:assert/strict';
import test from 'node:test';
import { retryTablePaymentReservation } from './retryTablePaymentReservation.js';
import { TablePaymentError } from './tablePaymentSupport.js';

const noWait = async (_ms: number) => {};

test('P2034 na reserva refaz a transação e permite reler estado idempotente', async () => {
  let calls = 0;
  const result = await retryTablePaymentReservation(async () => {
    calls += 1;
    if (calls < 3) throw { code: 'P2034' };
    return { publicId: 'same-intent', reused: true };
  }, noWait);

  assert.deepEqual(result, { publicId: 'same-intent', reused: true });
  assert.equal(calls, 3);
});

test('colisão apenas na chave idempotente pode refazer reserva após rollback', async () => {
  let calls = 0;
  const result = await retryTablePaymentReservation(async () => {
    calls += 1;
    if (calls === 1) throw {
      code: 'P2002',
      meta: { target: ['restaurantId', 'tableSessionId', 'idempotencyKeyHash'] },
    };
    return 'existing-intent';
  }, noWait);

  assert.equal(result, 'existing-intent');
  assert.equal(calls, 2);
});

test('outra chave única, falha inesperada ou erro de negócio não são reexecutados', async () => {
  for (const error of [
    { code: 'P2002', meta: { target: ['provider', 'providerExternalId'] } },
    new Error('database offline'),
    new TablePaymentError('saldo reservado', 409, 'TABLE_BALANCE_RESERVED'),
  ]) {
    let calls = 0;
    await assert.rejects(
      retryTablePaymentReservation(async () => {
        calls += 1;
        throw error;
      }, noWait),
      (caught) => caught === error,
    );
    assert.equal(calls, 1);
  }
});

test('conflito persistente encerra tentativas limitadas sem executar operação externa', async () => {
  let reservationCalls = 0;
  let providerCalls = 0;
  await assert.rejects(
    retryTablePaymentReservation(async () => {
      reservationCalls += 1;
      throw { code: 'P2034' };
    }, noWait).then(() => {
      providerCalls += 1;
    }),
    (error) =>
      error instanceof TablePaymentError &&
      error.statusCode === 409 &&
      error.code === 'TABLE_PAYMENT_CONFLICT',
  );
  assert.equal(reservationCalls, 5);
  assert.equal(providerCalls, 0);
});
