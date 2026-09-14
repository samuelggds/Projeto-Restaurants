import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import controller from './CreateOrderPixPaymentController.js';
import createOrder from '../services/CreateOrderService.js';
import pix from '../services/OrderPixPaymentService.js';
import prisma from '../../../config/prisma.js';

const original = {
  create: createOrder.execute,
  pix: pix.createPixPayment,
  tx: prisma.$transaction,
};
afterEach(() => {
  createOrder.execute = original.create;
  pix.createPixPayment = original.pix;
  prisma.$transaction = original.tx;
});

for (const paid of [false, true]) {
  test(`falha ambígua preserva pedido PIX e reservas, inclusive com webhook pago=${paid}`, async () => {
    const order = {
      id: 91,
      publicId: 'order-public',
      restaurantId: 7,
      type: 'RETIRADA',
      total: 25,
      itemsSubtotal: 25,
      couponDiscount: 0,
      deliveryFeeAmount: 0,
      paid: false,
    };
    createOrder.execute = async () => order as any;
    pix.createPixPayment = async () => {
      order.paid = paid;
      throw new Error('gateway-token-secret');
    };
    prisma.$transaction = (() => {
      throw new Error('Não deve excluir pedido nem liberar estoque/cupom.');
    }) as any;
    let status = 0;
    let body: any;
    const res = {
      status(code: number) {
        status = code;
        return res;
      },
      json(value: unknown) {
        body = value;
        return res;
      },
    } as unknown as Response;
    await controller.handle(
      {
        headers: {},
        body: { restaurantId: 7, type: 'RETIRADA', paymentMethod: 'PIX' },
        user: { id: 3, restaurantId: 7 },
      } as Request,
      res,
    );
    assert.equal(status, 502);
    assert.equal(body.code, 'PAYMENT_CREATION_UNCERTAIN');
    assert.equal(body.reconciliationRequired, true);
    assert.equal(body.orderId, 91);
    assert.equal(body.orderPublicId, 'order-public');
    assert.equal(JSON.stringify(body).includes('gateway-token-secret'), false);
    assert.equal(order.paid, paid);
  });
}
