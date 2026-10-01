// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { OrderStatus, OrderType, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import rateDeliveredOrderService from './RateDeliveredOrderService.js';

const originals = {
  findByIdForCustomer: orderRepository.findByIdForCustomer,
  findFirst: prisma.order.findFirst,
  updateMany: prisma.order.updateMany,
};

afterEach(() => {
  orderRepository.findByIdForCustomer = originals.findByIdForCustomer;
  prisma.order.findFirst = originals.findFirst;
  prisma.order.updateMany = originals.updateMany;
});

const delivered = (overrides = {}) => ({
  id: 91,
  restaurantId: 7,
  type: OrderType.DELIVERY,
  status: OrderStatus.ENTREGUE,
  deliveryConfirmedAt: new Date(),
  ...overrides,
});

test('cliente autenticado avalia somente o próprio pedido confirmado e preserva tenant', async () => {
  orderRepository.findByIdForCustomer = async (id, customerId) =>
    id === 91 && customerId === 12 ? delivered() : null;
  let capturedWhere;
  prisma.order.updateMany = async ({ where }) => {
    capturedWhere = where;
    return { count: 1 };
  };
  prisma.order.findFirst = async () => ({
    id: 91,
    restaurantId: 7,
    deliveryRating: 5,
    deliveryRatedAt: new Date(),
  });

  const result = await rateDeliveredOrderService.execute({
    orderId: 91,
    customerId: 12,
    role: UserRole.CLIENTE,
    rating: 5,
  });

  assert.equal(result.deliveryRating, 5);
  assert.equal(capturedWhere.restaurantId, 7);
  assert.equal(capturedWhere.status, OrderStatus.ENTREGUE);
});

test('visitante só avalia pedido correspondente ao publicId autenticado pelo token', async () => {
  let call = 0;
  prisma.order.findFirst = async ({ where }) => {
    call += 1;
    if (call === 1) {
      return where.id === 91 && where.publicId === 'public-91' ? delivered() : null;
    }
    return { id: 91, restaurantId: 7, deliveryRating: 4, deliveryRatedAt: new Date() };
  };
  prisma.order.updateMany = async ({ where }) => {
    assert.equal(where.restaurantId, 7);
    return { count: 1 };
  };

  const result = await rateDeliveredOrderService.execute({
    orderId: 91,
    customerId: 0,
    role: UserRole.CLIENTE,
    guestPublicId: 'public-91',
    rating: 4,
  });
  assert.equal(result.deliveryRating, 4);
});

test('bloqueia nota inválida, outro cliente e entrega ainda não confirmada', async () => {
  await assert.rejects(
    () => rateDeliveredOrderService.execute({
      orderId: 91,
      customerId: 12,
      role: UserRole.CLIENTE,
      rating: 6,
    }),
    /entre 1 e 5/,
  );

  orderRepository.findByIdForCustomer = async () => null;
  await assert.rejects(
    () => rateDeliveredOrderService.execute({
      orderId: 91,
      customerId: 13,
      role: UserRole.CLIENTE,
      rating: 5,
    }),
    /não encontrado/,
  );

  orderRepository.findByIdForCustomer = async () => delivered({ deliveryConfirmedAt: null });
  await assert.rejects(
    () => rateDeliveredOrderService.execute({
      orderId: 91,
      customerId: 12,
      role: UserRole.CLIENTE,
      rating: 5,
    }),
    /Confirme o recebimento/,
  );
});
