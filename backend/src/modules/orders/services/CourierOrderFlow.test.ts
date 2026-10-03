// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach, mock } from 'node:test';
import { OrderStatus, OrderType, PaymentMethod, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import orderRepository from '../repositories/OrderRepository.js';
import courierAccessService from './CourierAccessService.js';
import updateOrderStatusService from './UpdateOrderStatusService.js';
import { generateDeliveryConfirmationCode } from '../utils/deliveryConfirmationCode.js';
import orderCapacityQueueService from './OrderCapacityQueueService.js';

beforeEach(() => {
  mock.method(orderCapacityQueueService, 'drainAfterCapacityChange', async () => []);
  prisma.restaurantSettings.findUnique = async () => null;
});

const originals = {
  transaction: prisma.$transaction,
  userFindFirst: prisma.user.findFirst,
  settingsFindUnique: prisma.restaurantSettings.findUnique,
  ioTo: io.to,
  findById: orderRepository.findById,
  assertActiveCourier: courierAccessService.assertActiveCourier,
};

afterEach(() => {
  mock.restoreAll();
  prisma.$transaction = originals.transaction;
  prisma.user.findFirst = originals.userFindFirst;
  prisma.restaurantSettings.findUnique = originals.settingsFindUnique;
  io.to = originals.ioTo;
  orderRepository.findById = originals.findById;
  courierAccessService.assertActiveCourier = originals.assertActiveCourier;
});

function deliveryOrder(overrides = {}) {
  return {
    id: 91,
    publicId: 'public-order-91',
    userId: 12,
    restaurantId: 7,
    assignedCourierId: 31,
    type: OrderType.DELIVERY,
    status: OrderStatus.SAIU_PARA_ENTREGA,
    deliveryStartedAt: new Date('2026-09-05T15:00:00.000Z'),
    deliveredAt: null,
    paid: true,
    payOnDelivery: true,
    paymentMethod: PaymentMethod.DINHEIRO,
    observation: null,
    user: { id: 12, name: 'Cliente', phone: '+5585999991234' },
    restaurant: { id: 7, name: 'Restaurante', whatsapp: null },
    items: [{ id: 1, quantity: 1, product: { id: 5, name: 'Produto' } }],
    ...overrides,
  };
}

function codeFor(order) {
  return generateDeliveryConfirmationCode({
    orderId: order.id,
    publicId: order.publicId,
    deliveryStartedAt: order.deliveryStartedAt,
  });
}

function activeCourier() {
  courierAccessService.assertActiveCourier = async (courierId, restaurantId) => {
    assert.equal(courierId, 31);
    assert.equal(restaurantId, 7);
    return { id: 31, restaurantId: 7 };
  };
}

function completionTx({ count = 1, current, cashPending = false }) {
  return {
    $queryRaw: async () => [{ set_config: '7' }],
    order: {
      updateMany: async ({ where, data }) => {
        assert.equal(where.restaurantId, 7);
        assert.equal(where.type, OrderType.DELIVERY);
        assert.equal(where.status, OrderStatus.SAIU_PARA_ENTREGA);
        if (cashPending) {
          assert.equal(where.payOnDelivery, true);
          assert.ok(Array.isArray(where.OR));
          assert.equal(where.paid, undefined);
        } else {
          assert.equal(where.paid, true);
        }
        assert.deepEqual(where.refundStatus, { notIn: ['PROCESSING', 'SUCCEEDED'] });
        assert.equal(where.assignedCourierId, 31);
        assert.equal(data.status, OrderStatus.ENTREGUE);
        return { count };
      },
      findFirst: async () => ({ couponRedemptionId: null }),
    },
    user: { findFirst: async () => ({ id: 31 }) },
    auditLog: { create: async () => ({ id: 1 }) },
    __current: current,
  };
}

test('pago + código correto conclui entrega de forma atômica', async () => {
  const order = deliveryOrder();
  const delivered = { ...order, status: OrderStatus.ENTREGUE, deliveredAt: new Date() };
  activeCourier();
  orderRepository.findById = async (_id, _restaurantId, db) => (db ? delivered : order);
  prisma.$transaction = async (callback) => callback(completionTx({ current: delivered }));
  io.to = () => ({ emit() {} });

  const result = await updateOrderStatusService.execute(
    91,
    7,
    OrderStatus.ENTREGUE,
    UserRole.MOTOQUEIRO,
    codeFor(order),
    31,
  );
  assert.equal(result.status, OrderStatus.ENTREGUE);
  assert.equal(result.paid, true);
});

test('pago + código ausente ou incorreto permanece bloqueado', async () => {
  const order = deliveryOrder();
  activeCourier();
  orderRepository.findById = async () => order;
  let transactions = 0;
  prisma.$transaction = async () => {
    transactions += 1;
  };

  await assert.rejects(
    () =>
      updateOrderStatusService.execute(91, 7, OrderStatus.ENTREGUE, UserRole.MOTOQUEIRO, '', 31),
    /código de 4 dígitos/i,
  );
  await assert.rejects(
    () =>
      updateOrderStatusService.execute(
        91,
        7,
        OrderStatus.ENTREGUE,
        UserRole.MOTOQUEIRO,
        '0000',
        31,
      ),
    /Código de entrega inválido/,
  );
  assert.equal(transactions, 0);
});

test('dinheiro não pago + código correto conclui entrega sem marcar pagamento', async () => {
  const order = deliveryOrder({
    paid: false,
    paymentMethod: PaymentMethod.DINHEIRO,
    payOnDeliveryMethod: PaymentMethod.DINHEIRO,
  });
  const delivered = { ...order, status: OrderStatus.ENTREGUE, deliveredAt: new Date() };
  let pendingAudit = 0;
  activeCourier();
  orderRepository.findById = async (_id, _restaurantId, db) => (db ? delivered : order);
  prisma.$transaction = async (callback) =>
    callback({
      ...completionTx({ current: delivered, cashPending: true }),
      auditLog: {
        create: async ({ data }) => {
          pendingAudit += 1;
          assert.equal(data.action, 'COURIER_CASH_DELIVERY_COMPLETED_PENDING_PAYMENT');
          assert.equal(data.metadata.paymentConfirmed, false);
          assert.equal(data.metadata.deliveryConfirmedByCustomerCode, true);
          assert.equal(data.metadata.deliveryConfirmationCode, undefined);
          return { id: 1 };
        },
      },
    });
  io.to = () => ({ emit() {} });

  const result = await updateOrderStatusService.execute(
    91,
    7,
    OrderStatus.ENTREGUE,
    UserRole.MOTOQUEIRO,
    codeFor(order),
    31,
  );

  assert.equal(result.status, OrderStatus.ENTREGUE);
  assert.equal(result.paid, false);
  assert.equal(pendingAudit, 1);
});

test('PIX e cartão não pagos continuam bloqueados para o motoqueiro', async () => {
  activeCourier();
  for (const paymentMethod of [PaymentMethod.PIX, PaymentMethod.CARTAO]) {
    const order = deliveryOrder({
      paid: false,
      payOnDelivery: true,
      paymentMethod,
      payOnDeliveryMethod: paymentMethod,
    });
    orderRepository.findById = async () => order;
    await assert.rejects(
      () =>
        updateOrderStatusService.execute(
          91,
          7,
          OrderStatus.ENTREGUE,
          UserRole.MOTOQUEIRO,
          codeFor(order),
          31,
        ),
      /pagamento precisa estar confirmado/i,
    );
  }
});

for (const refundStatus of ['PROCESSING', 'SUCCEEDED']) {
  test(`estorno ${refundStatus} impede entrega mesmo com pagamento e código corretos`, async () => {
    const order = deliveryOrder({
      refundStatus,
      paymentMethod: PaymentMethod.CARTAO,
      payOnDelivery: false,
    });
    activeCourier();
    orderRepository.findById = async () => order;
    let transactions = 0;
    prisma.$transaction = async () => {
      transactions += 1;
    };
    for (const role of [UserRole.MOTOQUEIRO, UserRole.ADMIN]) {
      await assert.rejects(
        () =>
          updateOrderStatusService.execute(91, 7, OrderStatus.ENTREGUE, role, codeFor(order), 31),
        /estorno.*não pode ser entregue/i,
      );
    }
    assert.equal(transactions, 0);
  });
}

test('outro motoqueiro é bloqueado', async () => {
  activeCourier();
  orderRepository.findById = async () => deliveryOrder({ assignedCourierId: 32 });
  await assert.rejects(
    () =>
      updateOrderStatusService.execute(
        91,
        7,
        OrderStatus.ENTREGUE,
        UserRole.MOTOQUEIRO,
        '1234',
        31,
      ),
    /não está atribuída a você/,
  );
});

test('conta de motoqueiro inativa é bloqueada', async () => {
  orderRepository.findById = async () => deliveryOrder();
  courierAccessService.assertActiveCourier = async () => {
    throw new Error('Motoqueiro inativo.');
  };
  await assert.rejects(
    () =>
      updateOrderStatusService.execute(
        91,
        7,
        OrderStatus.ENTREGUE,
        UserRole.MOTOQUEIRO,
        '1234',
        31,
      ),
    /inativo/,
  );
});

test('pedido em status inadequado é bloqueado', async () => {
  activeCourier();
  const order = deliveryOrder({ status: OrderStatus.PRONTO });
  orderRepository.findById = async () => order;
  await assert.rejects(
    () =>
      updateOrderStatusService.execute(
        91,
        7,
        OrderStatus.ENTREGUE,
        UserRole.MOTOQUEIRO,
        codeFor(order),
        31,
      ),
    /Transição inválida|SAIU_PARA_ENTREGA/,
  );
});

test('outro restaurante não encontra o pedido no tenant solicitado', async () => {
  orderRepository.findById = async (_id, restaurantId) =>
    restaurantId === 7 ? deliveryOrder() : null;
  await assert.rejects(
    () =>
      updateOrderStatusService.execute(
        91,
        8,
        OrderStatus.ENTREGUE,
        UserRole.MOTOQUEIRO,
        '1234',
        31,
      ),
    /Pedido não encontrado/,
  );
});

test('requisição simultânea que perdeu a corrida retorna estado já concluído sem novos efeitos', async () => {
  const order = deliveryOrder();
  const delivered = { ...order, status: OrderStatus.ENTREGUE, deliveredAt: new Date() };
  activeCourier();
  orderRepository.findById = async (_id, _restaurantId, db) => (db ? delivered : order);
  prisma.$transaction = async (callback) =>
    callback(completionTx({ count: 0, current: delivered }));
  let emissions = 0;
  io.to = () => ({
    emit() {
      emissions += 1;
    },
  });

  const result = await updateOrderStatusService.execute(
    91,
    7,
    OrderStatus.ENTREGUE,
    UserRole.MOTOQUEIRO,
    codeFor(order),
    31,
  );
  assert.equal(result.status, OrderStatus.ENTREGUE);
  assert.equal(emissions, 0);
});

test('requisição repetida após conclusão é idempotente e não emite eventos', async () => {
  const delivered = deliveryOrder({ status: OrderStatus.ENTREGUE, deliveredAt: new Date() });
  activeCourier();
  orderRepository.findById = async () => delivered;
  let emissions = 0;
  io.to = () => ({
    emit() {
      emissions += 1;
    },
  });
  const result = await updateOrderStatusService.execute(
    91,
    7,
    OrderStatus.ENTREGUE,
    UserRole.MOTOQUEIRO,
    '0000',
    31,
  );
  assert.equal(result.status, OrderStatus.ENTREGUE);
  assert.equal(emissions, 0);
});


test('exceção administrativa exige ADMIN ativo do mesmo restaurante e gera auditoria', async () => {
  const order = deliveryOrder();
  const delivered = { ...order, status: OrderStatus.ENTREGUE, deliveredAt: new Date() };
  let audits = 0;
  orderRepository.findById = async (_id, _restaurantId, db) => (db ? delivered : order);
  prisma.$transaction = async (callback) =>
    callback({
      ...completionTx({ current: delivered }),
      user: {
        findFirst: async ({ where }) => {
          assert.equal(where.restaurantId, 7);
          assert.equal(where.role, UserRole.ADMIN);
          assert.equal(where.active, true);
          return { id: 44, name: 'Admin' };
        },
      },
      order: {
        updateMany: async () => ({ count: 1 }),
        findFirst: async () => ({ couponRedemptionId: null }),
      },
      auditLog: {
        create: async ({ data }) => {
          audits += 1;
          assert.equal(data.action, 'ADMIN_DELIVERY_COMPLETED');
          return { id: 1 };
        },
      },
    });
  io.to = () => ({ emit() {} });
  const result = await updateOrderStatusService.execute(
    91,
    7,
    OrderStatus.ENTREGUE,
    UserRole.ADMIN,
    undefined,
    44,
  );
  assert.equal(result.status, OrderStatus.ENTREGUE);
  assert.equal(audits, 1);
});
