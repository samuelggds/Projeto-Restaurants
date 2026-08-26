// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import orderRepository from '../repositories/OrderRepository.js';
import getCurrentTableOrderService from './GetCurrentTableOrderService.js';

const originalFindLatestByTableParticipant = orderRepository.findLatestByTableParticipant;

afterEach(() => {
  orderRepository.findLatestByTableParticipant = originalFindLatestByTableParticipant;
});

test('consulta o pedido atual somente pela sessão, tenant e participante validados', async () => {
  orderRepository.findLatestByTableParticipant = async (
    tableSessionId,
    restaurantId,
    participantId,
  ) => {
    assert.deepEqual([tableSessionId, restaurantId, participantId], [55, 7, 80]);
    return { publicId: '123e4567-e89b-42d3-a456-426614174001' };
  };

  const result = await getCurrentTableOrderService.execute({
    tableSessionId: 55,
    restaurantId: 7,
    participantId: 80,
  });

  assert.equal(result?.publicId, '123e4567-e89b-42d3-a456-426614174001');
});

test('não consulta o banco sem os três identificadores internos validados', async () => {
  let called = false;
  orderRepository.findLatestByTableParticipant = async () => {
    called = true;
  };

  const result = await getCurrentTableOrderService.execute({
    tableSessionId: 55,
    restaurantId: 7,
    participantId: 0,
  });

  assert.equal(result, null);
  assert.equal(called, false);
});

test('repositório não seleciona dados pessoais nem detalhes do pagamento', async () => {
  let query;
  const fakeDb = {
    order: {
      findFirst: async (args) => {
        query = args;
        return null;
      },
    },
  };

  await originalFindLatestByTableParticipant.call(orderRepository, 55, 7, 80, fakeDb);

  assert.deepEqual(query.where, {
    tableSessionId: 55,
    restaurantId: 7,
    participantId: 80,
    type: 'MESA',
  });
  const serializedSelect = JSON.stringify(query.select);
  assert.doesNotMatch(serializedSelect, /user|email|phone|cpf|paymentMethod|pixPaymentId/i);
  assert.deepEqual(query.orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
});
