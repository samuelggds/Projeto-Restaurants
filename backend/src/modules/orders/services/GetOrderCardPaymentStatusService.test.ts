// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import orderRepository from '../repositories/OrderRepository.js';
import getOrderCardPaymentStatusService from './GetOrderCardPaymentStatusService.js';
import { issueGuestOrderOwnershipToken } from '../utils/guestOrderOwnershipToken.js';
import createOrderService from './CreateOrderService.js';
import orderPaymentAttemptRepository from '../repositories/OrderPaymentAttemptRepository.js';

const originalFindCardPaymentStatusByPublicId = orderRepository.findCardPaymentStatusByPublicId;
const originalLatestAttempt = orderPaymentAttemptRepository.latestForOrder;
const originalUpdateAttempt = orderPaymentAttemptRepository.update;
const originalSecret = process.env.GUEST_ORDER_OWNERSHIP_SECRET;

orderPaymentAttemptRepository.latestForOrder = async () => null;

afterEach(() => {
  orderRepository.findCardPaymentStatusByPublicId = originalFindCardPaymentStatusByPublicId;
  orderPaymentAttemptRepository.latestForOrder = async () => null;
  orderPaymentAttemptRepository.update = originalUpdateAttempt;
  if (originalSecret === undefined) delete process.env.GUEST_ORDER_OWNERSHIP_SECRET;
  else process.env.GUEST_ORDER_OWNERSHIP_SECRET = originalSecret;
});

const orderPublicId = '123e4567-e89b-42d3-a456-426614174001';

test('retorna pendente somente para o participante dono do pedido de mesa', async () => {
  orderRepository.findCardPaymentStatusByPublicId = async (publicId, restaurantId) => {
    assert.deepEqual([publicId, restaurantId], [orderPublicId, 7]);
    return {
      publicId: orderPublicId,
      restaurantId: 7,
      userId: null,
      type: 'MESA',
      tableSessionId: 55,
      participantId: 80,
      paymentMethod: 'CARTAO',
      payOnDelivery: false,
      paid: false,
      status: 'PENDENTE',
    };
  };

  const result = await getOrderCardPaymentStatusService.execute({
    orderPublicId,
    restaurantId: 7,
    tableSessionId: 55,
    participantId: 80,
  });

  assert.deepEqual(result, {
    orderPublicId,
    status: 'PENDING',
    paid: false,
    paymentAttempt: null,
  });
});

test('não revela pedido de mesa para outro participante', async () => {
  orderRepository.findCardPaymentStatusByPublicId = async () => ({
    publicId: orderPublicId,
    restaurantId: 7,
    userId: null,
    type: 'MESA',
    tableSessionId: 55,
    participantId: 81,
    paymentMethod: 'CARTAO',
    payOnDelivery: false,
    paid: true,
    status: 'PENDENTE',
  });

  await assert.rejects(
    getOrderCardPaymentStatusService.execute({
      orderPublicId,
      restaurantId: 7,
      tableSessionId: 55,
      participantId: 80,
    }),
    /Pagamento com cartão não encontrado/,
  );
});

test('confirma somente o pedido canônico pertencente ao cliente autenticado', async () => {
  orderRepository.findCardPaymentStatusByPublicId = async () => ({
    publicId: orderPublicId,
    restaurantId: 9,
    userId: 33,
    type: 'DELIVERY',
    tableSessionId: null,
    participantId: null,
    paymentMethod: 'CARTAO',
    payOnDelivery: false,
    paid: true,
    status: 'PENDENTE',
  });

  const result = await getOrderCardPaymentStatusService.execute({
    orderPublicId,
    restaurantId: 9,
    userId: 33,
  });

  assert.equal(result.status, 'PAID');
  assert.equal(result.paid, true);

  await assert.rejects(
    getOrderCardPaymentStatusService.execute({
      orderPublicId,
      restaurantId: 9,
      userId: 34,
    }),
    /Pagamento com cartão não encontrado/,
  );
});

test('visitante criado recebe status somente com prova assinada do seu pedido', async () => {
  process.env.GUEST_ORDER_OWNERSHIP_SECRET = 'synthetic-guest-proof-secret-more-than-32-chars';
  const guestId = await createOrderService.resolveOrderUser({
    tx: { user: { upsert: async () => ({ id: 33 }) } },
    restaurantId: 9,
    customerName: 'Visitante',
    customerPhone: '11999999999',
    guestPasswordHash: 'synthetic-hash',
  });
  orderRepository.findCardPaymentStatusByPublicId = async () => ({
    id: 501,
    publicId: orderPublicId,
    restaurantId: 9,
    userId: guestId,
    type: 'RETIRADA',
    tableSessionId: null,
    participantId: null,
    paymentMethod: 'CARTAO',
    payOnDelivery: false,
    paid: false,
    status: 'CANCELADO',
  });

  const result = await getOrderCardPaymentStatusService.execute({
    orderPublicId,
    restaurantId: 9,
    guest: true,
    guestOwnershipToken: issueGuestOrderOwnershipToken({ orderId: 501, publicId: orderPublicId }),
  });

  assert.equal(result.status, 'CANCELED');
  assert.equal(result.paid, false);
  for (const token of [
    '',
    'invalid',
    issueGuestOrderOwnershipToken({ orderId: 999, publicId: orderPublicId }),
    issueGuestOrderOwnershipToken({
      orderId: 501,
      publicId: '123e4567-e89b-42d3-a456-426614174002',
    }),
  ]) {
    await assert.rejects(
      () =>
        getOrderCardPaymentStatusService.execute({
          orderPublicId,
          restaurantId: 9,
          guest: true,
          guestOwnershipToken: token,
        }),
      /não encontrado/,
    );
  }
});

test('rejeita UUID inválido e pedidos que não são checkout online de cartão', async () => {
  let repositoryCalls = 0;
  orderRepository.findCardPaymentStatusByPublicId = async () => {
    repositoryCalls += 1;
    return {
      publicId: orderPublicId,
      restaurantId: 9,
      userId: null,
      type: 'DELIVERY',
      tableSessionId: null,
      participantId: null,
      paymentMethod: 'PIX',
      payOnDelivery: false,
      paid: true,
      status: 'PENDENTE',
    };
  };

  await assert.rejects(
    getOrderCardPaymentStatusService.execute({
      orderPublicId: 'pedido-1',
      restaurantId: 9,
      guest: true,
    }),
    /Pagamento com cartão não encontrado/,
  );
  assert.equal(repositoryCalls, 0);

  await assert.rejects(
    getOrderCardPaymentStatusService.execute({
      orderPublicId,
      restaurantId: 9,
      guest: true,
    }),
    /Pagamento com cartão não encontrado/,
  );
});
