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
    refundStatus: null,
    observation: null,
    user: { id: 12, name: 'Cliente', phone: '+5585999991234' },
    restaurant: { id: 7, name: 'Restaurante', whatsapp: null },
    items: [{ id: 1, quantity: 1, product: { id: 5, name: 'Produto' } }],
    ...overrides,
  };
}

function deliveryCode(order) {
  return generateDeliveryConfirmationCode({
    orderId: order.id,
    publicId: order.publicId,
    deliveryStartedAt: order.deliveryStartedAt,
  });
}

test('retirada persiste GPS quando informado e também funciona sem localização', async () => {
  let savedLocation;
  const emissions = [];
  const order = deliveryOrder();
  const tx = {
    $queryRaw: async () => [{ set_config: '7' }],
    user: {
      findFirst: async ({ where }) => {
        assert.deepEqual(where, { id: 31, restaurantId: 7, role: UserRole.MOTOQUEIRO, active: true });
        return { id: 31, restaurantId: 7 };
      },
    },
    courierCompensationPolicy: {
      findFirst: async () => ({
        id: 1,
        restaurantId: 7,
        courierId: 31,
        model: 'FIXED_PER_DELIVERY',
        fixedAmount: 8,
        baseAmount: 0,
        includedDistanceMeters: 0,
        extraPerKmAmount: 0,
        ranges: [],
      }),
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
  io.to = (room) => ({ emit(event, payload) { emissions.push({ room, event, payload }); } });

  const result = await claimOrderForDeliveryService.execute({
    orderId: 91,
    restaurantId: 7,
    courierId: 31,
    role: UserRole.MOTOQUEIRO,
    initialLocation: { latitude: -3.7319, longitude: -38.5267, accuracy: 8, sentAt: new Date().toISOString() },
  });
  assert.equal(result.id, 91);
  assert.equal(savedLocation.orderId, 91);
  assert.equal(savedLocation.courierId, 31);
  assert.equal(emissions.some(({ event }) => event === 'order:delivery-location'), true);

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
});

test('retirada rejeita GPS inválido antes da transação', async () => {
  let transactionCalls = 0;
  prisma.$transaction = async () => { transactionCalls += 1; };
  await assert.rejects(
    () => claimOrderForDeliveryService.execute({
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
  courierAccessService.assertActiveCourier = async (courierId, restaurantId) => ({ id: courierId, restaurantId });
  orderRepository.findCourierOrderById = async (id, restaurantId, courierId) => {
    assert.equal(id, 91);
    assert.equal(restaurantId, 7);
    assert.equal(courierId, 31);
    return deliveryOrder();
  };
  assert.equal((await getOrderByIdService.execute(91, 7, UserRole.MOTOQUEIRO, null, 31)).id, 91);
});

test('pago + código correto conclui a entrega uma única vez', async () => {
  const order = deliveryOrder({ paid: true });
  const delivered = { ...order, status: OrderStatus.ENTREGUE, deliveredAt: new Date() };
  let writes = 0;
  courierAccessService.assertActiveCourier = async () => ({ id: 31, restaurantId: 7 });
  orderRepository.findById = async (_id, _restaurantId, db) => (db ? delivered : order);
  prisma.$transaction = async (callback) => callback({
    order: {
      updateMany: async ({ where, data }) => {
        writes += 1;
        assert.equal(where.restaurantId, 7);
        assert.equal(where.assignedCourierId, 31);
        assert.equal(where.paid, true);
        assert.equal(where.status, OrderStatus.SAIU_PARA_ENTREGA);
        assert.equal(data.status, OrderStatus.ENTREGUE);
        return { count: 1 };
      },
      findFirst: async () => ({ couponRedemptionId: null }),
    },
  });
  io.to = () => ({ emit() {} });
  const result = await updateOrderStatusService.execute(91, 7, OrderStatus.ENTREGUE, UserRole.MOTOQUEIRO, deliveryCode(order), 31);
  assert.equal(result.status, OrderStatus.ENTREGUE);
  assert.equal(result.paid, true);
  assert.equal(writes, 1);
});

test('pago + código ausente ou incorreto é bloqueado antes de escrever', async () => {
  const order = deliveryOrder({ paid: true });
  let transactions = 0;
  courierAccessService.assertActiveCourier = async () => ({ id: 31, restaurantId: 7 });
  orderRepository.findById = async () => order;
  prisma.$transaction = async () => { transactions += 1; };
  await assert.rejects(
    () => updateOrderStatusService.execute(91, 7, OrderStatus.ENTREGUE, UserRole.MOTOQUEIRO, '', 31),
    /código de 4 dígitos/i,
  );
  await assert.rejects(
    () => updateOrderStatusService.execute(91, 7, OrderStatus.ENTREGUE, UserRole.MOTOQUEIRO, '0000', 31),
    /Código de entrega inválido/,
  );
  assert.equal(transactions, 0);
});

test('não pago + código correto e dinheiro ainda não confirmado são bloqueados', async () => {
  const order = deliveryOrder({ paid: false, paymentMethod: PaymentMethod.DINHEIRO });
  courierAccessService.assertActiveCourier = async () => ({ id: 31, restaurantId: 7 });
  orderRepository.findById = async () => order;
  await assert.rejects(
    () => updateOrderStatusService.execute(91, 7, OrderStatus.ENTREGUE, UserRole.MOTOQUEIRO, deliveryCode(order), 31),
    /pagamento precisa estar confirmado/i,
  );
});

test('outro motoqueiro ou conta inativa não conclui entrega', async () => {
  orderRepository.findById = async () => deliveryOrder({ paid: true, assignedCourierId: 32 });
  courierAccessService.assertActiveCourier = async () => ({ id: 31, restaurantId: 7 });
  await assert.rejects(
    () => updateOrderStatusService.execute(91, 7, OrderStatus.ENTREGUE, UserRole.MOTOQUEIRO, '1234', 31),
    /não está atribuída a você/,
  );
  courierAccessService.assertActiveCourier = async () => { throw new Error('Motoqueiro inativo.'); };
  orderRepository.findById = async () => deliveryOrder({ paid: true });
  await assert.rejects(
    () => updateOrderStatusService.execute(91, 7, OrderStatus.ENTREGUE, UserRole.MOTOQUEIRO, '1234', 31),
    /inativo/,
  );
});

test('pedido em status inadequado é bloqueado', async () => {
  const order = deliveryOrder({ paid: true, status: OrderStatus.PRONTO });
  orderRepository.findById = async () => order;
  courierAccessService.assertActiveCourier = async () => ({ id: 31, restaurantId: 7 });
  await assert.rejects(
    () => updateOrderStatusService.execute(91, 7, OrderStatus.ENTREGUE, UserRole.MOTOQUEIRO, deliveryCode(order), 31),
    /Transição inválida|sair para entrega/,
  );
});

test('requisição repetida ou concorrente não conclui nem duplica efeitos', async () => {
  const order = deliveryOrder({ paid: true });
  const alreadyDelivered = { ...order, status: OrderStatus.ENTREGUE, deliveredAt: new Date() };
  courierAccessService.assertActiveCourier = async () => ({ id: 31, restaurantId: 7 });
  orderRepository.findById = async (_id, _restaurantId, db) => (db ? alreadyDelivered : order);
  prisma.$transaction = async (callback) => callback({
    order: {
      updateMany: async () => ({ count: 0 }),
      findFirst: async () => ({ couponRedemptionId: null }),
    },
  });
  await assert.rejects(
    () => updateOrderStatusService.execute(91, 7, OrderStatus.ENTREGUE, UserRole.MOTOQUEIRO, deliveryCode(order), 31),
    /já foi concluída/,
  );
});

test('PIN de pagamento não permite atalhos digitais e continua preso ao motoqueiro atribuído', async () => {
  courierAccessService.assertActiveCourier = async () => ({ id: 31, restaurantId: 7 });
  orderRepository.findById = async () => deliveryOrder({
    assignedCourierId: 31,
    paymentMethod: PaymentMethod.PIX,
    paymentConfirmationPin: 'hash',
    paymentConfirmationPinExpiresAt: new Date(Date.now() + 60_000),
  });
  await assert.rejects(
    () => requestOrderPaymentConfirmationPinService.execute(91, 7, UserRole.MOTOQUEIRO, 31),
    /dinheiro/,
  );
  await assert.rejects(
    () => confirmOrderPaymentWithPinService.execute(91, 7, UserRole.MOTOQUEIRO, '1234', 31),
    /dinheiro/,
  );
});

test('consulta do repositório prende tenant, canal, pagamento, status e atribuição', async () => {
  let query;
  const fakeDb = { order: { findFirst: async (args) => { query = args; return null; } } };
  await orderRepository.findCourierOrderById(91, 7, 31, fakeDb);
  assert.equal(query.where.id, 91);
  assert.equal(query.where.restaurantId, 7);
  assert.equal(query.where.type, OrderType.DELIVERY);
  assert.deepEqual(query.where.OR, [
    { status: OrderStatus.PRONTO, assignedCourierId: null },
    { status: { in: [OrderStatus.SAIU_PARA_ENTREGA, OrderStatus.ENTREGUE] }, assignedCourierId: 31 },
  ]);
});
