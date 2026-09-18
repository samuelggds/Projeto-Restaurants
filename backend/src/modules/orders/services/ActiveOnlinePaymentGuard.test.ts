import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderType, PaymentMethod, Prisma } from '@prisma/client';
import { ActiveOnlinePaymentError } from '../domain/ActiveOnlinePaymentError.js';
import { assertNoActiveOnlinePayment } from './ActiveOnlinePaymentGuard.js';

function fakeDb(active: Record<string, unknown> | null) {
  const queries: string[] = [];
  const db = {
    $queryRaw: async (strings: TemplateStringsArray) => {
      queries.push(strings.join(' '));
      return [{ id: 42 }];
    },
    order: {
      findFirst: async () => active,
    },
  } as unknown as Prisma.TransactionClient;
  return { db, queries };
}

test('bloqueia um segundo Pix online ativo do mesmo cliente e restaurante', async () => {
  const now = new Date('2026-09-18T12:00:00.000Z');
  const { db, queries } = fakeDb({
    id: 91,
    publicId: '11111111-1111-4111-8111-111111111111',
    paymentMethod: PaymentMethod.PIX,
    type: OrderType.DELIVERY,
    pixExpiresAt: new Date('2026-09-18T12:20:00.000Z'),
    createdAt: new Date('2026-09-18T11:50:00.000Z'),
  });

  await assert.rejects(
    () =>
      assertNoActiveOnlinePayment({
        db,
        restaurantId: 7,
        type: OrderType.DELIVERY,
        userId: 42,
        now,
      }),
    (error) =>
      error instanceof ActiveOnlinePaymentError &&
      error.code === 'ACTIVE_PAYMENT_EXISTS' &&
      error.statusCode === 409 &&
      error.orderId === 91 &&
      error.paymentMethod === PaymentMethod.PIX &&
      error.expiresAt === '2026-09-18T12:20:00.000Z',
  );
  assert.match(queries.join('\n'), /pg_advisory_xact_lock/u);
});

test('bloqueia cartão online pendente dentro da janela de trinta minutos', async () => {
  const now = new Date('2026-09-18T12:00:00.000Z');
  const { db } = fakeDb({
    id: 92,
    publicId: '22222222-2222-4222-8222-222222222222',
    paymentMethod: PaymentMethod.CARTAO,
    type: OrderType.RETIRADA,
    pixExpiresAt: null,
    createdAt: new Date('2026-09-18T11:50:00.000Z'),
  });

  await assert.rejects(
    () =>
      assertNoActiveOnlinePayment({
        db,
        restaurantId: 7,
        type: OrderType.RETIRADA,
        userId: 42,
        now,
      }),
    (error) =>
      error instanceof ActiveOnlinePaymentError &&
      error.paymentMethod === PaymentMethod.CARTAO &&
      error.expiresAt === '2026-09-18T12:20:00.000Z',
  );
});

test('permite novo checkout quando não existe pagamento ativo no escopo', async () => {
  const { db } = fakeDb(null);
  await assert.doesNotReject(() =>
    assertNoActiveOnlinePayment({
      db,
      restaurantId: 7,
      type: OrderType.DELIVERY,
      userId: 42,
      now: new Date('2026-09-18T12:00:00.000Z'),
    }),
  );
});

test('mesa serializa e consulta pelo participante da sessão, não pela mesa inteira', async () => {
  const { db, queries } = fakeDb(null);
  await assert.doesNotReject(() =>
    assertNoActiveOnlinePayment({
      db,
      restaurantId: 7,
      type: OrderType.MESA,
      userId: null,
      tableSessionId: 31,
      participantId: 44,
      now: new Date('2026-09-18T12:00:00.000Z'),
    }),
  );
  assert.match(queries.join('\n'), /pg_advisory_xact_lock/u);
});
