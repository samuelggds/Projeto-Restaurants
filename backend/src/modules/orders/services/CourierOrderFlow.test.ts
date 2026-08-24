// @ts-nocheck
import assert from 'node:assert/strict';
import http from 'node:http';
import test, { afterEach } from 'node:test';
import { OrderStatus, OrderType, PaymentMethod, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import courierAccessService from './CourierAccessService.js';

const originalHttpCreateServer = http.createServer;
http.createServer = ((...args) => {
  const server = originalHttpCreateServer(...args);
  server.listen = () => server;
  return server;
}) as typeof http.createServer;

const { io } = await import('../../../server.js');
const { default: claimOrderForDeliveryService } = await import('./ClaimOrderForDeliveryService.js');
const { default: getOrderByIdService } = await import('./GetOrderByIdService.js');
const { default: updateOrderStatusService } = await import('./UpdateOrderStatusService.js');
const { default: requestOrderPaymentConfirmationPinService } =
  await import('./RequestOrderPaymentConfirmationPinService.js');
const { default: confirmOrderPaymentWithPinService } =
  await import('./ConfirmOrderPaymentWithPinService.js');
http.createServer = originalHttpCreateServer;

const originals = {
  transaction: prisma.$transaction,
  ioTo: io.to,
  findById: orderRepository.findById,
  findCourierOrderById: orderRepository.findCourierOrderById,
  updateStatusIfCurrent: orderRepository.updateStatusIfCurrent,
  assertActiveCourier: courierAccessService.assertActiveCourier,
};

afterEach(() => {
  prisma.$transaction = originals.transaction;
  io.to = originals.ioTo;
  orderRepository.findById = originals.findById;
  orderRepository.findCourierOrderById = originals.findCourierOrderById;
  orderRepository.updateStatusIfCurrent = originals.updateStatusIfCurrent;
  courierAccessService.assertActiveCourier = originals.assertActiveCourier;
});

function deliveryOrder(overrides = {}) {
  return {
    id: 91,
    userId: 12,
    restaurantId: 7,
    assignedCourierId: 31,
    type: OrderType.DELIVERY,
    status: OrderStatus.SAIU_PARA_ENTREGA,
    paid: false,
    payOnDelivery: true,
    paymentMethod: PaymentMethod.DINHEIRO,
    paymentConfirmationPin: null,
    paymentConfirmationPinExpiresAt: null,
    observation: null,
    user: { id: 12, name: 'Cliente', phone: '+5585999991234' },
    restaurant: { id: 7, name: 'Restaurante', whatsapp: null },
    items: [{ id: 1, quantity: 1, product: { id: 5, name: 'Produto' } }],
    ...overrides,
  };
}

test('retirada valida conta e persiste o primeiro GPS na mesma transação', async () => {
  let savedLocation;
  const emissions = [];
  const order = deliveryOrder();
  const tx = {
    user: {
      findFirst: async ({ where }) => {
        assert.deepEqual(where, {
          id: 31,
          restaurantId: 7,
          role: UserRole.MOTOQUEIRO,
          active: true,
        });
        return { id: 31, restaurantId: 7 };
      },
    },
    restaurantSettings: {
      findUnique: async () => ({ courierFeePerDelivery: 8 }),
    },
    order: {
      updateMany: async ({ where, data }) => {
        assert.equal(where.restaurantId, 7);
        assert.equal(where.status, OrderStatus.PRONTO);
        assert.equal(where.assignedCourierId, null);
        assert.equal(data.assignedCourierId, 31);
        assert.equal(data.status, OrderStatus.SAIU_PARA_ENTREGA);
        return { count: 1 };
      },
      findFirst: async () => order,
    },
    deliveryLocation: {
      create: async ({ data }) => {
        savedLocation = data;
        return { recordedAt: data.recordedAt };
      },
    },
  };
  prisma.$transaction = async (callback) => callback(tx);
  io.to = (room) => ({
    emit(event, payload) {
      emissions.push({ room, event, payload });
    },
  });

  const result = await claimOrderForDeliveryService.execute({
    orderId: 91,
    restaurantId: 7,
    courierId: 31,
    role: UserRole.MOTOQUEIRO,
    initialLocation: {
      latitude: -3.7319,
      longitude: -38.5267,
      accuracy: 8,
      sentAt: new Date().toISOString(),
    },
  });

  assert.equal(result.id, 91);
  assert.equal(savedLocation.orderId, 91);
  assert.equal(savedLocation.courierId, 31);
  assert.equal(savedLocation.latitude, -3.7319);
  assert.equal(
    emissions.find(({ event }) => event === 'order:delivery-location')?.payload.restaurantId,
    7,
  );
  assert.equal(
    emissions.some(({ room, event }) => room === 'user:12' && event === 'order:delivery-location'),
    true,
  );
  assert.equal(
    emissions.some(
      ({ room, event }) => room === 'restaurant:7:admin' && event === 'order:delivery-location',
    ),
    true,
  );
});

test('retirada exige GPS atual e rejeita posição inválida antes da transação', async () => {
  let transactionCalls = 0;
  prisma.$transaction = async () => {
    transactionCalls += 1;
  };

  await assert.rejects(
    () =>
      claimOrderForDeliveryService.execute({
        orderId: 91,
        restaurantId: 7,
        courierId: 31,
        role: UserRole.MOTOQUEIRO,
        initialLocation: null,
      }),
    /localização atual é obrigatória/,
  );

  await assert.rejects(
    () =>
      claimOrderForDeliveryService.execute({
        orderId: 91,
        restaurantId: 7,
        courierId: 31,
        role: UserRole.MOTOQUEIRO,
        initialLocation: { latitude: 200, longitude: -38.5 },
      }),
    /Coordenadas inválidas/,
  );
  assert.equal(transactionCalls, 0);
});

test('detalhe do motoqueiro usa somente pedido disponível ou atribuído à própria conta', async () => {
  courierAccessService.assertActiveCourier = async (courierId, restaurantId) => {
    assert.equal(courierId, 31);
    assert.equal(restaurantId, 7);
    return { id: courierId, restaurantId };
  };
  orderRepository.findCourierOrderById = async (id, restaurantId, courierId) => {
    assert.equal(id, 91);
    assert.equal(restaurantId, 7);
    assert.equal(courierId, 31);
    return deliveryOrder();
  };

  assert.equal((await getOrderByIdService.execute(91, 7, UserRole.MOTOQUEIRO, null, 31)).id, 91);
});

test('motoqueiro não conclui entrega atribuída a outra conta', async () => {
  courierAccessService.assertActiveCourier = async () => ({ id: 31, restaurantId: 7 });
  orderRepository.findById = async () => deliveryOrder({ assignedCourierId: 32 });
  let updateCalls = 0;
  orderRepository.updateStatusIfCurrent = async () => {
    updateCalls += 1;
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
    /não está atribuída a você/,
  );
  assert.equal(updateCalls, 0);
});

test('PIN de pagamento só pode ser solicitado e usado pelo motoqueiro atribuído', async () => {
  courierAccessService.assertActiveCourier = async () => ({ id: 31, restaurantId: 7 });
  orderRepository.findById = async () =>
    deliveryOrder({
      assignedCourierId: 32,
      paymentMethod: PaymentMethod.PIX,
      paymentConfirmationPin: 'hash',
      paymentConfirmationPinExpiresAt: new Date(Date.now() + 60_000),
    });

  await assert.rejects(
    () => requestOrderPaymentConfirmationPinService.execute(91, 7, UserRole.MOTOQUEIRO, 31),
    /não está atribuída a você/,
  );
  await assert.rejects(
    () => confirmOrderPaymentWithPinService.execute(91, 7, UserRole.MOTOQUEIRO, '1234', 31),
    /não está atribuída a você/,
  );
});

test('consulta do repositório prende tenant, canal, pagamento, status e atribuição', async () => {
  let query;
  const fakeDb = {
    order: {
      findFirst: async (args) => {
        query = args;
        return null;
      },
    },
  };

  await orderRepository.findCourierOrderById(91, 7, 31, fakeDb);

  assert.equal(query.where.id, 91);
  assert.equal(query.where.restaurantId, 7);
  assert.equal(query.where.type, OrderType.DELIVERY);
  assert.deepEqual(query.where.OR, [
    { status: OrderStatus.PRONTO, assignedCourierId: null },
    {
      status: { in: [OrderStatus.SAIU_PARA_ENTREGA, OrderStatus.ENTREGUE] },
      assignedCourierId: 31,
    },
  ]);
  assert.equal(query.where.NOT.payOnDelivery, false);
  assert.deepEqual(query.where.NOT.paymentMethod.in, [PaymentMethod.PIX, PaymentMethod.CARTAO]);
});
