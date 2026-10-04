import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import controller from './CreateOrderCardCheckoutController.js';
import service from '../services/CreateOrderCardCheckoutService.js';

const originalExecute = service.execute;
afterEach(() => {
  service.execute = originalExecute;
});

for (const savedCard of [true, false]) {
  test(`checkout inicial encaminha a sessão antifraude com cartão ${savedCard ? 'salvo' : 'novo'}`, async () => {
    const received: Array<Parameters<typeof service.execute>[0]> = [];
    service.execute = async (payload) => {
      received.push(payload);
      return {
        orderId: 903,
        orderPublicId: 'order-public-903',
        provider: 'MERCADO_PAGO',
        sessionId: 'ORD_CARD_903',
        checkoutUrl: 'https://pedido.example/north-pizza?cardCheckoutStatus=pending',
        challengeUrl: null,
        paid: false,
        paymentAttemptId: 'payment-attempt-903',
      };
    };

    let status = 0;
    let responseBody: Record<string, unknown> = {};
    const res = {
      status(code: number) {
        status = code;
        return res;
      },
      json(value: Record<string, unknown>) {
        responseBody = value;
        return res;
      },
    } as unknown as Response;

    await controller.handle(
      {
        headers: {},
        user: { id: 33, role: 'CLIENTE', restaurantId: 7 },
        ip: '127.0.0.1',
        body: {
          restaurantId: 7,
          type: 'RETIRADA',
          paymentMethod: 'CARTAO',
          items: [{ productId: 1, quantity: 1 }],
          ...(savedCard ? { paymentMethodId: 'saved-card-public-id' } : {}),
          cardToken: 'single-use-card-token',
          cardPaymentMethodId: 'master',
          mercadoPagoDeviceId: 'checkout-device-session-903',
        },
      } as unknown as Request,
      res,
    );

    assert.equal(status, 201);
    assert.equal(received.length, 1);
    assert.equal(received[0].mercadoPagoDeviceId, 'checkout-device-session-903');
    assert.equal(received[0].paymentMethodId, savedCard ? 'saved-card-public-id' : undefined);
    assert.equal(received[0].cardToken, 'single-use-card-token');
    assert.equal(received[0].userId, 33);
    assert.equal(received[0].restaurantId, 7);
    assert.equal(responseBody.orderPublicId, 'order-public-903');
    assert.equal('mercadoPagoDeviceId' in responseBody, false);
  });
}
