// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import prisma from '../../../config/prisma.js';
import retryService from './RetryOrderCardPaymentService.js';
import recoveryService from './GetOrderPaymentRecoveryService.js';
import statusService from './GetOrderCardPaymentStatusService.js';
import checkoutService from './CreateOrderCardCheckoutService.js';
import directService, { CardPaymentDeclinedError } from './DirectOrderCardPaymentService.js';
import orderRepository from '../repositories/OrderRepository.js';

const publicId = '123e4567-e89b-42d3-a456-426614174001';
const actor = { userId: 9, role: 'CLIENTE' };
const payload = {
  cardToken: 'synthetic-token',
  cardPaymentMethodId: 'visa',
  cardPaymentType: 'credit',
};

function installDatabase(t) {
  const order = {
    id: 41,
    restaurantId: 7,
    publicId,
    paid: false,
    status: 'PENDENTE',
    paymentMethod: 'CARTAO',
    payOnDelivery: false,
    refundStatus: 'NOT_REQUESTED',
    total: 50,
    createdAt: new Date(),
    cardCheckoutSessionId: 'mp_order:DECLINED-OLD',
  };
  const attempts = [
    { id: 1, publicId: 'previous-attempt', status: 'DECLINED', providerOrderId: 'DECLINED-OLD' },
  ];
  let lockTail = Promise.resolve();
  const orderDelegate = {
    findFirst: async () => ({ ...order }),
    updateMany: async ({ data }) => {
      Object.assign(order, data);
      return { count: 1 };
    },
  };
  const originalTransaction = prisma.$transaction;
  const originalOrderUpdate = prisma.order.updateMany;
  t.after(() => {
    prisma.$transaction = originalTransaction;
    prisma.order.updateMany = originalOrderUpdate;
  });
  prisma.$transaction = async (callback) => {
    let release;
    try {
      return await callback({
        $queryRaw: async (sql, ...values) => {
          if (String(sql).includes('FOR UPDATE')) {
            assert.deepEqual(values, [41, 7]);
            const previous = lockTail;
            lockTail = new Promise((resolve) => {
              release = resolve;
            });
            await previous;
          }
          return [];
        },
        order: orderDelegate,
        orderPaymentAttempt: {
          findFirst: async ({ where }) => {
            const matches = attempts.filter(
              (a) => !where.status || where.status.in.includes(a.status),
            );
            return matches.at(-1) ? { ...matches.at(-1) } : null;
          },
          create: async ({ data }) => {
            const attempt = { id: attempts.length + 1, ...data };
            attempts.push(attempt);
            return { ...attempt };
          },
          update: async ({ where, data }) => {
            const attempt = attempts.find((a) => a.id === where.id);
            Object.assign(attempt, data);
            return { ...attempt };
          },
        },
      });
    } finally {
      release?.();
    }
  };
  prisma.order.updateMany = orderDelegate.updateMany;
  t.mock.method(orderRepository, 'findById', async () => ({ ...order }));
  // Deliberately stale snapshots reproduce two browser tabs that read the same
  // declined attempt; only the repository's locked claim can prevent a charge.
  t.mock.method(recoveryService, 'execute', async () => ({
    orderId: 41,
    orderPublicId: publicId,
    restaurantId: 7,
    restaurantName: 'Audit',
    paymentMethod: 'CARTAO',
    paid: false,
    canRetry: true,
    totalAmount: 50,
    paymentAttempt: { status: 'DECLINED', cardPaymentType: 'credit' },
  }));
  t.mock.method(checkoutService, 'resolveCardProvider', async () => 'MERCADO_PAGO');
  return { order, attempts };
}

function pendingCheckout(id = 'ORD-NEW') {
  return {
    provider: 'MERCADO_PAGO',
    sessionId: id,
    persistenceSessionId: `mp_order:${id}`,
    checkoutUrl: '',
    paymentApproved: false,
    providerStatus: 'processing',
  };
}

test('claims simultâneos serializam leitura e reserva da próxima tentativa', async (t) => {
  const { attempts } = installDatabase(t);
  let calls = 0;
  t.mock.method(directService, 'execute', async () => {
    calls += 1;
    return pendingCheckout();
  });
  const results = await Promise.allSettled([
    retryService.execute(publicId, actor, payload),
    retryService.execute(publicId, actor, payload),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = results.find((result) => result.status === 'rejected');
  assert.equal(rejected.reason.code, 'CARD_ATTEMPT_PROCESSING');
  assert.equal(calls, 1);
  assert.equal(attempts.length, 2);
});

test('duas tentativas concorrentes reservam somente uma cobrança, com referência anterior removida', async (t) => {
  const { order, attempts } = installDatabase(t);
  let releaseGateway;
  let gatewayStarted;
  const started = new Promise((resolve) => {
    gatewayStarted = resolve;
  });
  const pending = new Promise((resolve) => {
    releaseGateway = resolve;
  });
  const calls = [];
  t.mock.method(directService, 'execute', async (input) => {
    calls.push(input);
    gatewayStarted();
    await pending;
    return pendingCheckout();
  });
  const first = retryService.execute(publicId, actor, payload);
  await started;
  assert.equal(order.cardCheckoutSessionId, null);
  await assert.rejects(() => retryService.execute(publicId, actor, payload), {
    code: 'CARD_ATTEMPT_PROCESSING',
  });
  releaseGateway();
  assert.equal((await first).status, 'PENDING');
  assert.equal(calls.length, 1);
  assert.equal(attempts.length, 2);
  assert.equal(attempts[1].status, 'PROCESSING');
  assert.equal(calls[0].idempotencyKey, attempts[1].idempotencyKey);
  assert.equal(order.cardCheckoutSessionId, 'mp_order:ORD-NEW');
});

test('resposta incerta mantém reserva e impede nova cobrança mesmo com snapshot antigo', async (t) => {
  const { attempts } = installDatabase(t);
  let calls = 0;
  t.mock.method(directService, 'execute', async () => {
    calls += 1;
    throw new Error('timeout sintético');
  });
  t.mock.method(statusService, 'execute', async () => ({ paid: false, status: 'PENDING' }));
  await assert.rejects(() => retryService.execute(publicId, actor, payload), /timeout sintético/);
  await assert.rejects(() => retryService.execute(publicId, actor, payload), {
    code: 'CARD_ATTEMPT_PROCESSING',
  });
  assert.equal(calls, 1);
  assert.equal(attempts[1].status, 'PROCESSING');
  assert.equal(attempts[1].failureCode, 'reconciliation_required');
});

test('recusa confirmada libera uma nova tentativa com chave própria', async (t) => {
  const { attempts } = installDatabase(t);
  let calls = 0;
  t.mock.method(directService, 'execute', async () => {
    calls += 1;
    if (calls === 1) throw new CardPaymentDeclinedError('recusa sintética');
    return pendingCheckout();
  });
  await assert.rejects(() => retryService.execute(publicId, actor, payload), {
    code: 'CARD_PAYMENT_FAILED',
  });
  assert.equal((await retryService.execute(publicId, actor, payload)).status, 'PENDING');
  assert.deepEqual(
    attempts.map((a) => a.status),
    ['DECLINED', 'DECLINED', 'PROCESSING'],
  );
  assert.notEqual(attempts[1].idempotencyKey, attempts[2].idempotencyKey);
});

test('claim retorna pago se a confirmação venceu a corrida com o retry', async (t) => {
  const { order, attempts } = installDatabase(t);
  order.paid = true;
  t.mock.method(directService, 'execute', async () => assert.fail('não cobrar pedido pago'));
  assert.equal((await retryService.execute(publicId, actor, payload)).status, 'PAID');
  assert.equal(attempts.length, 1);
});

for (const reason of ['CANCELADO', 'EXPIRED_WINDOW', 'NO_INITIAL_ATTEMPT', 'APPROVED']) {
  test(`claim revalida elegibilidade antes de cobrar (${reason})`, async (t) => {
    const { order, attempts } = installDatabase(t);
    if (reason === 'CANCELADO') order.status = 'CANCELADO';
    if (reason === 'EXPIRED_WINDOW') order.createdAt = new Date(Date.now() - 31 * 60_000);
    if (reason === 'NO_INITIAL_ATTEMPT') attempts.length = 0;
    if (reason === 'APPROVED') attempts[0].status = 'APPROVED';
    t.mock.method(directService, 'execute', async () => assert.fail('cobrança indevida'));
    await assert.rejects(() => retryService.execute(publicId, actor, payload), { statusCode: 409 });
  });
}
