// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import failPendingOrderPaymentService from './FailPendingOrderPaymentService.js';
import reconcileLateCancelledPaymentService from './ReconcileLateCancelledPaymentService.js';
import refundOrderPaymentService from './RefundOrderPaymentService.js';

const baseOrder = {
  id: 40,
  restaurantId: 7,
  userId: 12,
  status: 'PENDENTE',
  paid: false,
  paymentMethod: 'PIX',
  payOnDelivery: false,
  total: 25,
  pixPaymentId: 'asaas:pay_1',
  cardCheckoutSessionId: null,
  couponRedemptionId: 99,
  items: [],
};

test('evento terminal cancela pedido pendente e libera apenas a reserva vinculada', async (t) => {
  const originalTransaction = prisma.$transaction;
  const originalFindById = orderRepository.findById;
  const originalUpdateStatus = orderRepository.updateStatusIfCurrent;
  let redemptionWhere;

  orderRepository.findById = async () => baseOrder;
  orderRepository.updateStatusIfCurrent = async (_id, status) => ({
    ...baseOrder,
    status,
  });
  prisma.$transaction = async (callback) =>
    callback({
      order: {
        findFirst: async () => ({ couponRedemptionId: 99 }),
        updateMany: async () => ({ count: 1 }),
      },
      couponRedemption: {
        updateMany: async ({ where }) => {
          redemptionWhere = where;
          return { count: 1 };
        },
        findFirst: async () => null,
      },
      product: { updateMany: async () => ({ count: 0 }) },
    });

  t.after(() => {
    prisma.$transaction = originalTransaction;
    orderRepository.findById = originalFindById;
    orderRepository.updateStatusIfCurrent = originalUpdateStatus;
  });

  const result = await failPendingOrderPaymentService.execute({ orderId: 40, restaurantId: 7 });

  assert.equal(result.status, 'CANCELADO');
  assert.equal(redemptionWhere.id, 99);
  assert.equal(redemptionWhere.restaurantId, 7);
  assert.equal(redemptionWhere.status, 'RESERVED');
});

test('pagamento tardio cancelado é estornado uma vez e marcado para idempotência', async (t) => {
  const originalFindById = orderRepository.findById;
  const originalUpdateMany = prisma.order.updateMany;
  const originalRefund = refundOrderPaymentService.execute;
  const order = {
    ...baseOrder,
    status: 'CANCELADO',
    pixPaymentId: null,
  };
  let refundCalls = 0;

  orderRepository.findById = async () => order;
  prisma.order.updateMany = async ({ where, data }) => {
    if (where.pixPaymentId !== order.pixPaymentId) {
      return { count: 0 };
    }
    order.pixPaymentId = data.pixPaymentId;
    return { count: 1 };
  };
  refundOrderPaymentService.execute = async (refundableOrder) => {
    refundCalls += 1;
    assert.equal(refundableOrder.paid, true);
    assert.equal(refundableOrder.pixPaymentId, 'asaas:pay_late');
  };

  t.after(() => {
    orderRepository.findById = originalFindById;
    prisma.order.updateMany = originalUpdateMany;
    refundOrderPaymentService.execute = originalRefund;
  });

  const first = await reconcileLateCancelledPaymentService.execute({
    orderId: 40,
    restaurantId: 7,
    paymentMethod: 'PIX',
    paymentReference: 'asaas:pay_late',
  });
  const second = await reconcileLateCancelledPaymentService.execute({
    orderId: 40,
    restaurantId: 7,
    paymentMethod: 'PIX',
    paymentReference: 'asaas:pay_late',
  });

  assert.equal(first, true);
  assert.equal(second, true);
  assert.equal(refundCalls, 1);
  assert.equal(order.pixPaymentId, 'late_refunded:asaas:pay_late');
});
