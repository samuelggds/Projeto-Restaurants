// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { OrderStatus, OrderType, PaymentMethod, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import orderRepository from '../repositories/OrderRepository.js';
import courierAccessService from './CourierAccessService.js';
import claimOrderForDeliveryService from './ClaimOrderForDeliveryService.js';
import getOrderByIdService from './GetOrderByIdService.js';
import updateOrderStatusService from './UpdateOrderStatusService.js';
import requestOrderPaymentConfirmationPinService from './RequestOrderPaymentConfirmationPinService.js';
import confirmOrderPaymentWithPinService from './ConfirmOrderPaymentWithPinService.js';
import { generateDeliveryConfirmationCode } from '../utils/deliveryConfirmationCode.js';

const originals = {
  transaction: prisma.$transaction,
  ioTo: io.to,
  findById: orderRepository.findById,
  findCourierOrderById: orderRepository.findCourierOrderById,
  updateStatusIfCurrent: orderRepository.updateStatusIfCurrent,
  confirmPayment: orderRepository.confirmPayment,
  assertActiveCourier: courierAccessService.assertActiveCourier,
};

afterEach(() => {
  prisma.$transaction = originals.transaction;
  io.to = originals.ioTo;
  orderRepository.findById = originals.findById;
  orderRepository.findCourierOrderById = originals.findCourierOrderById;
  orderRepository.updateStatusIfCurrent = originals.updateStatusIfCurrent;
  orderRepository.confirmPayment = originals.confirmPayment;
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

test('retirada persiste GPS quando informado e também funciona sem localização', async () => {
  let savedLocation;
  const emissions = [];
  const order = deliveryOrder();
  const tx = {
    $queryRaw: async () => [{ set_config: '7' }],
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
    courierCompensationPolicy: {
      findFirst: async ({ where }) => {
        assert.equal(where.restaurantId, 7);
        return {
          id: 1,
          restaurantId: 7,
          courierId: 31,
          model: 'FIXED_PER_DELIVERY',
          fixedAmount: 8,
          baseAmount: 0,
          includedDistanceMeters: 0,
          extraPerKmAmount: 0,
          ranges: [],
        };
      },
    },
    order: {
      updateMany: async ({ where, data }) => {
        assert.equal(where.restaurantId, 7);
        assert.equal(where.status, OrderStatus.PRONTO);
        assert.equal(where.assignedCourierId, null);
        assert.equal(data.assignedCourierId, 31);
        assert.equal(data.status, OrderStatus.SAIU_PARA_ENTREGA);
        assert.equal(data.courierEarning, '8.00');
        assert.equal(data.courierCompensationModel, 'FIXED_PER_DELIVERY');
        assert.ok(data.courierEarningCalculatedAt instanceof Date);
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

  savedLocation = undefined;
  emissions.length = 0;
  const resultWithoutGps = await claimOrderForDeliveryService.execute({
    orderId: 91,
    restaurantId: 7,
    courierId: 31,
    role: UserRole.MOTOQUEIRO,
    initialLocation: null,
  });

  assert.equal(resultWithoutGps.id, 91);
  assert.equal(savedLocation, undefined);
  assert.equal(
    emissions.some(({ event }) => event === 'order:delivery-location'),
    false,
  );
  assert.equal(
    emissions.some(({ room, event }) => room === 'restaurant:7' && event === 'order:status-changed'),
    true,
  );
});

test('retirada rejeita GPS inválido antes da transação quando localização é informada', async () => {
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

test('motoqueiro conclui dinheiro no handoff com código e pagamento é confirmado na mesma transação', async () => {
  const order = deliveryOrder();
  const code = generateDeliveryConfirmationCode({
    orderId: order.id,
    publicId: order.publicId,
    deliveryStartedAt: order.deliveryStartedAt,
  });
  const emissions = [];
  let paymentConfirmations = 0;

  courierAccessService.assertActiveCourier = async () => ({ id: 31, restaurantId: 7 });
  orderRepository.findById = async () => order;
  orderRepository.updateStatusIfCurrent = async () => ({ ...order, status: OrderStatus.ENTREGUE });
  orderRepository.confirmPayment = async () => {
    paymentConfirmations += 1;
    return { ...order, status: OrderStatus.ENTREGUE, paid: true, deliveredAt: new Date() };
  };

  const tx = {
    order: {
      update: async () => ({ ...order, status: OrderStatus.ENTREGUE, paid: false, deliveredAt: new Date() }),
      findFirst: async () => ({ couponRedemptionId: null }),
    },
  };
  prisma.$transaction = async (callback) => callback(tx);
  io.to = (room) => ({
    emit(event, payload) {
      emissions.push({ room, event, payload });
    },
  });

  const result = await updateOrderStatusService.execute(
    91,
    7,
    OrderStatus.ENTREGUE,
    UserRole.MOTOQUEIRO,
    code,
    31,
  );

  assert.equal(result.status, OrderStatus.ENTREGUE);
  assert.equal(result.paid, true);
  assert.equal(paymentConfirmations, 1);
  assert.equal(
    emissions.some(({ room, event }) => room === 'restaurant:7' && event === 'order:payment-confirmed'),
    true,
  );
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
  assert.deepEqual(query.where.AND[0].OR[0], {
    settlementMode: 'TABLE_ACCOUNT',
  });
  assert.equal(query.where.AND[0].OR[1].NOT.payOnDelivery, false);
  assert.equal(query.where.AND[0].OR[1].NOT.paid, false);
  assert.deepEqual(query.where.AND[0].OR[1].NOT.paymentMethod.in, [
    PaymentMethod.PIX,
    PaymentMethod.CARTAO,
  ]);
});