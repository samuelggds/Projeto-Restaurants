// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import http from 'node:http';
import { OrderRefundStatus, OrderStatus } from '@prisma/client';

const originalHttpCreateServer = http.createServer;
http.createServer = ((...args) => {
  const server = originalHttpCreateServer(...args);
  server.listen = () => server;
  return server;
}) as typeof http.createServer;

const [
  { default: cancelTableParticipantOrderService },
  { default: cancelOrderWorkflowService },
  { default: orderRepository },
  { default: tableAccountSettingsRepository },
] = await Promise.all([
  import('./CancelTableParticipantOrderService.js'),
  import('./CancelOrderWorkflowService.js'),
  import('../repositories/OrderRepository.js'),
  import('../../tableAccount/repositories/TableAccountSettingsRepository.js'),
]);
http.createServer = originalHttpCreateServer;

const originalFindOwnedOrder = orderRepository.findByPublicIdForTableParticipant;
const originalWorkflowExecute = cancelOrderWorkflowService.execute;
const originalFindTableAccountSettings = tableAccountSettingsRepository.findByRestaurantId;

afterEach(() => {
  orderRepository.findByPublicIdForTableParticipant = originalFindOwnedOrder;
  cancelOrderWorkflowService.execute = originalWorkflowExecute;
  tableAccountSettingsRepository.findByRestaurantId = originalFindTableAccountSettings;
});

const publicOrderId = '123e4567-e89b-42d3-a456-426614174010';

function makeTableOrder(overrides = {}) {
  return {
    id: 701,
    publicId: publicOrderId,
    restaurantId: 7,
    tableSessionId: 55,
    participantId: 80,
    userId: null,
    status: OrderStatus.PENDENTE,
    paid: false,
    paymentMethod: null,
    payOnDelivery: false,
    observation: null,
    refundStatus: OrderRefundStatus.NOT_REQUESTED,
    items: [],
    user: null,
    participant: { id: 80, publicId: 'participant-public-id', displayName: 'Convidado' },
    restaurant: { id: 7, name: 'Restaurante', whatsapp: null },
    table: { id: 91, number: 1, active: true, restaurantId: 7 },
    updatedAt: new Date('2026-08-25T12:00:00.000Z'),
    ...overrides,
  };
}

test('convidado cancela somente pedido vinculado ao próprio participante e sessão', async () => {
  const order = makeTableOrder();
  orderRepository.findByPublicIdForTableParticipant = async (...args) => {
    assert.deepEqual(args.slice(0, 4), [publicOrderId, 55, 7, 80]);
    return order;
  };
  cancelOrderWorkflowService.execute = async (received) => {
    assert.equal(received, order);
    return {
      order: { ...order, status: OrderStatus.CANCELADO },
      refunded: false,
    };
  };

  const result = await cancelTableParticipantOrderService.execute({
    publicOrderId,
    tableSessionId: 55,
    restaurantId: 7,
    participantId: 80,
  });

  assert.equal(result.status, OrderStatus.CANCELADO);
});

test('não revela nem cancela pedido de outro participante ou tenant', async () => {
  let workflowCalled = false;
  orderRepository.findByPublicIdForTableParticipant = async (...args) => {
    assert.deepEqual(args.slice(0, 4), [publicOrderId, 55, 7, 999]);
    return null;
  };
  cancelOrderWorkflowService.execute = async () => {
    workflowCalled = true;
  };

  await assert.rejects(
    () =>
      cancelTableParticipantOrderService.execute({
        publicOrderId,
        tableSessionId: 55,
        restaurantId: 7,
        participantId: 999,
      }),
    /pedido não encontrado/i,
  );
  assert.equal(workflowCalled, false);
});

test('pedido em preparo exige autorização quando a configuração do restaurante estiver ativa', async () => {
  const order = makeTableOrder({ status: OrderStatus.PREPARANDO });
  orderRepository.findByPublicIdForTableParticipant = async () => order;
  tableAccountSettingsRepository.findByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    return { requireEmployeeApprovalForPreparedItemCancellation: true };
  };
  let workflowCalled = false;
  cancelOrderWorkflowService.execute = async () => {
    workflowCalled = true;
  };

  await assert.rejects(
    () =>
      cancelTableParticipantOrderService.execute({
        publicOrderId,
        tableSessionId: 55,
        restaurantId: 7,
        participantId: 80,
      }),
    /precisa da autorização de um funcionário/i,
  );
  assert.equal(workflowCalled, false);
});

test('restaurante pode permitir que o participante cancele o próprio pedido em preparo', async () => {
  const order = makeTableOrder({ status: OrderStatus.PREPARANDO });
  orderRepository.findByPublicIdForTableParticipant = async () => order;
  tableAccountSettingsRepository.findByRestaurantId = async () => ({
    requireEmployeeApprovalForPreparedItemCancellation: false,
  });
  cancelOrderWorkflowService.execute = async (received) => ({
    order: { ...received, status: OrderStatus.CANCELADO },
    refunded: false,
  });

  const result = await cancelTableParticipantOrderService.execute({
    publicOrderId,
    tableSessionId: 55,
    restaurantId: 7,
    participantId: 80,
  });

  assert.equal(result.status, OrderStatus.CANCELADO);
});

test('repositório mantém a busca presa à chave composta do participante', async () => {
  let query;
  const fakeDb = {
    order: {
      findFirst: async (args) => {
        query = args;
        return null;
      },
    },
  };

  await originalFindOwnedOrder.call(orderRepository, publicOrderId, 55, 7, 80, fakeDb);

  assert.deepEqual(query.where, {
    publicId: publicOrderId,
    tableSessionId: 55,
    restaurantId: 7,
    participantId: 80,
    type: 'MESA',
  });
});
