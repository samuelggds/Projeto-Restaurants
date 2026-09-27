// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';
import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import updateRestaurantSettingsService from '../../restaurantSettings/services/UpdateRestaurantSettingsService.js';
import orderRepository from '../repositories/OrderRepository.js';
import queue from './OrderCapacityQueueService.js';
import cancelWorkflow from './CancelOrderWorkflowService.js';
import updateStatus from './UpdateOrderStatusService.js';
import confirmPayment from './ConfirmOrderPaymentService.js';
import finalizeCard from './FinalizeOrderCardPaymentService.js';
import finalizePix from './FinalizeOrderPixPaymentService.js';
import pixPayments from './OrderPixPaymentService.js';

const originalTransaction = prisma.$transaction;
const originalSettingsRead = prisma.restaurantSettings.findUnique;
afterEach(() => {
  prisma.$transaction = originalTransaction;
  prisma.restaurantSettings.findUnique = originalSettingsRead;
  mock.restoreAll();
});

function makeOrder(overrides = {}) {
  return {
    id: 91,
    restaurantId: 7,
    userId: 11,
    type: 'DELIVERY',
    status: 'PENDENTE',
    paid: false,
    paymentMethod: 'PIX',
    payOnDelivery: false,
    items: [],
    total: 50,
    refundStatus: 'NOT_REQUESTED',
    pixPaymentId: 'asaas:pay_91',
    capacityQueuedAt: null,
    capacityAdmittedAt: null,
    ...overrides,
  };
}

test('salvar limite aguarda drain após persistência, inclusive ao reenviar a configuração', async () => {
  let saved = { restaurantId: 7, maxConcurrentOrders: 1, restaurant: {} };
  mock.method(restaurantSettingsRepository, 'findByRestaurantId', async () => saved);
  mock.method(restaurantSettingsRepository, 'update', async (restaurantId, data) => {
    assert.equal(restaurantId, 7);
    saved = { ...saved, ...data };
    return saved;
  });
  let drainFinished = false;
  const drain = mock.method(queue, 'drainAfterCapacityChange', async (restaurantId) => {
    assert.equal(restaurantId, 7);
    assert.equal(saved.maxConcurrentOrders, 3);
    await Promise.resolve();
    drainFinished = true;
    return [];
  });
  await updateRestaurantSettingsService.execute({ restaurantId: 7, maxConcurrentOrders: 3 });
  assert.equal(drainFinished, true);
  await updateRestaurantSettingsService.execute({ restaurantId: 7, maxConcurrentOrders: 3 });
  assert.equal(drain.mock.callCount(), 2);
});

test('salvar configuração não relacionada não consulta fila; falha de gravação não admite pedidos', async () => {
  mock.method(restaurantSettingsRepository, 'findByRestaurantId', async () => ({
    restaurantId: 7,
    restaurant: {},
  }));
  const update = mock.method(restaurantSettingsRepository, 'update', async () => ({
    restaurantId: 7,
  }));
  const drain = mock.method(queue, 'drainAfterCapacityChange', async () => []);
  await updateRestaurantSettingsService.execute({ restaurantId: 7, primaryColor: '#123456' });
  assert.equal(drain.mock.callCount(), 0);
  update.mock.mockImplementation(async () => {
    throw new Error('save failed');
  });
  await assert.rejects(
    updateRestaurantSettingsService.execute({ restaurantId: 7, maxConcurrentOrders: 3 }),
    /save failed/,
  );
  assert.equal(drain.mock.callCount(), 0);
});

test('cancelamento admin/cliente pelo workflow libera fila somente depois do commit', async () => {
  const order = makeOrder({ paymentMethod: 'DINHEIRO' });
  let committed = false;
  mock.method(orderRepository, 'updateStatusIfCurrent', async (_id, status, restaurantId) => {
    assert.equal(restaurantId, 7);
    return { ...order, status };
  });
  prisma.$transaction = async (callback) => {
    const result = await callback({
      order: { findFirst: async () => ({ couponRedemptionId: null }) },
    });
    committed = true;
    return result;
  };
  const drain = mock.method(queue, 'drainAfterCapacityChange', async (restaurantId) => {
    assert.equal(restaurantId, 7);
    assert.equal(committed, true);
    return [];
  });
  assert.equal((await cancelWorkflow.execute(order)).order.status, 'CANCELADO');
  assert.equal(drain.mock.callCount(), 1);
});

test('cancelamento que falha não libera vaga nem tenta drenar outro tenant', async () => {
  const order = makeOrder({ paymentMethod: 'DINHEIRO' });
  prisma.$transaction = async () => {
    throw new Error('rollback');
  };
  mock.method(orderRepository, 'findById', async () => order);
  const drain = mock.method(queue, 'drainAfterCapacityChange', async () => []);
  await assert.rejects(cancelWorkflow.execute(order), /rollback/);
  assert.equal(drain.mock.callCount(), 0);
});

test('concluir entrega de mesa aguarda avanço da fila sem exigir worker separado', async () => {
  const order = makeOrder({ type: 'MESA', status: 'PRONTO', paid: true });
  let committed = false;
  mock.method(orderRepository, 'findById', async () => order);
  mock.method(orderRepository, 'updateStatusIfCurrent', async () => ({
    ...order,
    status: 'ENTREGUE',
  }));
  mock.method(io, 'to', () => ({ emit() {} }));
  prisma.restaurantSettings.findUnique = async () => null;
  prisma.$transaction = async (callback) => {
    const result = await callback({
      order: {
        update: async () => ({ ...order, status: 'ENTREGUE' }),
        findFirst: async () => ({ couponRedemptionId: null }),
      },
    });
    committed = true;
    return result;
  };
  let drained = false;
  mock.method(queue, 'drainAfterCapacityChange', async (restaurantId) => {
    assert.equal(committed, true);
    assert.equal(restaurantId, 7);
    await Promise.resolve();
    drained = true;
    return [];
  });
  await updateStatus.execute(91, 7, 'ENTREGUE', 'ADMIN');
  assert.equal(drained, true);
});

for (const payment of ['PIX', 'CARTAO', 'ADMIN']) {
  test(`${payment}: pagamento de pedido na fila tenta admissão pós-commit e retorna estado atualizado`, async () => {
    const order = makeOrder({
      paymentMethod: payment === 'CARTAO' ? 'CARTAO' : 'PIX',
      capacityQueuedAt: new Date(),
    });
    let committed = false;
    mock.method(io, 'to', () => ({ emit() {} }));
    mock.method(orderRepository, 'findById', async () => order);
    mock.method(orderRepository, 'findByPixPaymentId', async () => order);
    mock.method(orderRepository, 'claimPixPaymentId', async () => order);
    mock.method(orderRepository, 'confirmPayment', async () => ({ ...order, paid: true }));
    mock.method(pixPayments, 'ensurePaymentApproved', async () => {});
    prisma.restaurantSettings.findUnique = async () => null;
    prisma.$transaction = async (callback) => {
      const result = await callback({
        $queryRaw: async () => [{ paid: false }],
        order: {
          findFirst: async ({ select }) =>
            select?.couponRedemptionId ? { couponRedemptionId: null } : order,
          count: async () => 1,
          updateMany: async ({ where }) => {
            assert.equal(where.restaurantId, 7);
            return { count: 1 };
          },
        },
        restaurantSettings: { findUnique: async () => ({ maxConcurrentOrders: 1 }) },
        user: { findFirst: async () => ({ id: 30, name: 'Admin' }) },
        auditLog: { create: async () => ({ id: 1 }) },
      });
      committed = true;
      return result;
    };
    const admitted = { ...order, paid: true, capacityAdmittedAt: new Date(), status: 'PREPARANDO' };
    const drain = mock.method(queue, 'drainAfterCapacityChange', async (restaurantId) => {
      assert.equal(committed, true);
      assert.equal(restaurantId, 7);
      return [admitted];
    });
    const result =
      payment === 'PIX'
        ? await finalizePix.execute({ orderId: 91, restaurantId: 7, paymentId: 'asaas:pay_91' })
        : payment === 'CARTAO'
          ? await finalizeCard.execute({
              orderId: 91,
              restaurantId: 7,
              checkoutSessionId: 'asaas_pay:pay_91',
            })
          : await confirmPayment.execute(91, 7, 'ADMIN', 30);
    assert.equal(result.status, 'PREPARANDO');
    assert.equal(result.capacityAdmittedAt, admitted.capacityAdmittedAt);
    assert.equal(drain.mock.callCount(), 1);
  });
}
