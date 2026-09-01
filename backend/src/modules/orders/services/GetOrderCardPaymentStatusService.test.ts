// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import orderRepository from '../repositories/OrderRepository.js';
import getOrderCardPaymentStatusService from './GetOrderCardPaymentStatusService.js';

const originalFindCardPaymentStatusByPublicId = orderRepository.findCardPaymentStatusByPublicId;

afterEach(() => {
  orderRepository.findCardPaymentStatusByPublicId = originalFindCardPaymentStatusByPublicId;
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

test('aceita o publicId como credencial de retorno para pedido convidado e preserva cancelamento', async () => {
  orderRepository.findCardPaymentStatusByPublicId = async () => ({
    publicId: orderPublicId,
    restaurantId: 9,
    userId: null,
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
  });

  assert.equal(result.status, 'CANCELED');
  assert.equal(result.paid, false);
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
